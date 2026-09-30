import { createHmac, randomUUID } from "node:crypto";
import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { fromBech32 } from "@cosmjs/encoding";
import { majorToBaseUnits } from "./amount.js";
import { RelayerConfig } from "./config.js";
import { CosmosRelayer, isSyntheticDenom } from "./cosmos.js";
import { verifyWebhookSignature } from "./hmac.js";
import { SerialQueue } from "./queue.js";
import { TagStore } from "./tag-store.js";

const TAG_PATTERN = /^[a-z0-9_]{3,20}$/;

interface DepositPayload {
  reference: string;
  address: string;
  denom: string;
  amount: string;
}

type DepositResult =
  | { status: "duplicate" }
  | { status: "minted"; txHash: string; height: number };

class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export async function createRelayerServer(
  config: RelayerConfig,
  chain: CosmosRelayer,
  tags = new TagStore(config.dataDir),
  queue = new SerialQueue(),
): Promise<Server> {
  await tags.load();
  return createServer((request, response) => {
    void handleRequest(request, response, config, chain, tags, queue).catch(
      (error: unknown) => {
        if (!response.headersSent) {
          const status = error instanceof HttpError ? error.status : 500;
          sendJson(response, status, { error: errorMessage(error) });
        } else {
          response.destroy(error instanceof Error ? error : undefined);
        }
      },
    );
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  config: RelayerConfig,
  chain: CosmosRelayer,
  tags: TagStore,
  queue: SerialQueue,
): Promise<void> {
  addCorsHeaders(response);
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }

  const url = new URL(request.url ?? "/", "http://relayer.local");
  if (url.pathname === "/rpc" || url.pathname.startsWith("/rpc/")) {
    proxyRpc(request, response, config.chainRpc);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    try {
      sendJson(response, 200, await chain.health());
    } catch {
      sendJson(response, 503, { ok: false, height: 0 });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/accounts") {
    const body = await readJson(request);
    const address = requiredString(body, "address");
    const tag = requiredString(body, "tag");
    if (!isLedgerxAddress(address)) {
      sendJson(response, 400, { error: "address must be a valid ledgerx1 address" });
      return;
    }
    if (!TAG_PATTERN.test(tag)) {
      sendJson(response, 400, { error: "tag must match ^[a-z0-9_]{3,20}$" });
      return;
    }
    const existing = tags.get(tag);
    if (existing !== undefined && existing !== address) {
      sendJson(response, 409, { error: "tag is already taken" });
      return;
    }
    if (existing === address) {
      sendJson(response, 200, { tag, address });
      return;
    }

    try {
      const result = await queue.run(async () => {
        const registered = tags.get(tag);
        if (registered !== undefined) {
          if (registered !== address) {
            return { conflict: true as const };
          }
          return { conflict: false as const };
        }
        const grant = await chain.grantFeeAllowance(address);
        await tags.add(tag, address);
        return { conflict: false as const, grantTxHash: grant.txHash };
      });
      if (result.conflict) {
        sendJson(response, 409, { error: "tag is already taken" });
      } else {
        sendJson(response, 200, {
          tag,
          address,
          ...(result.grantTxHash ? { grantTxHash: result.grantTxHash } : {}),
        });
      }
    } catch (error) {
      sendJson(response, 502, { error: errorMessage(error) });
    }
    return;
  }

  const availableMatch = /^\/v1\/tags\/([^/]+)\/available$/.exec(url.pathname);
  if (request.method === "GET" && availableMatch) {
    const tag = decodePathComponent(availableMatch[1] ?? "");
    sendJson(response, 200, {
      available: Boolean(tag && TAG_PATTERN.test(tag) && tags.isAvailable(tag)),
    });
    return;
  }

  const tagMatch = /^\/v1\/tags\/([^/]+)$/.exec(url.pathname);
  if (request.method === "GET" && tagMatch) {
    const tag = decodePathComponent(tagMatch[1] ?? "");
    const address = tags.get(tag);
    if (!address) {
      sendJson(response, 404, { error: "tag not found" });
    } else {
      sendJson(response, 200, { tag, address });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/webhooks/deposit") {
    if (!config.webhookSecret) {
      sendJson(response, 503, { error: "WEBHOOK_SECRET is not configured" });
      return;
    }
    const rawBody = await readBody(request);
    const timestamp = headerValue(request, "x-ledgerx-timestamp");
    const signature = headerValue(request, "x-ledgerx-signature");
    try {
      const signedDeposit = await processSignedDeposit(
        rawBody,
        timestamp,
        signature,
        config.webhookSecret,
        chain,
        queue,
      );
      if (!signedDeposit.valid) {
        sendJson(response, 401, { error: "invalid webhook signature or timestamp" });
      } else {
        sendJson(response, 200, signedDeposit.result);
      }
    } catch (error) {
      sendJson(response, error instanceof HttpError ? error.status : 502, {
        error: errorMessage(error),
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/sandbox/deposit") {
    if (!config.sandbox) {
      sendJson(response, 404, { error: "not found" });
      return;
    }
    if (!config.webhookSecret) {
      sendJson(response, 503, { error: "WEBHOOK_SECRET is not configured" });
      return;
    }

    try {
      const body = await readJson(request);
      const payload = parseDepositPayload(
        JSON.stringify({
          reference: `sbx-${randomUUID()}`,
          address: requiredString(body, "address"),
          denom: requiredString(body, "denom"),
          amount: requiredString(body, "amount"),
        }),
      );
      const rawBody = Buffer.from(JSON.stringify(payload));
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = createHmac("sha256", config.webhookSecret)
        .update(`${timestamp}.${rawBody.toString("utf8")}`)
        .digest("hex");
      const signedDeposit = await processSignedDeposit(
        rawBody,
        timestamp,
        signature,
        config.webhookSecret,
        chain,
        queue,
      );
      if (!signedDeposit.valid) {
        throw new Error("sandbox webhook signature was rejected");
      }
      sendJson(response, 200, {
        ...signedDeposit.result,
        reference: payload.reference,
      });
    } catch (error) {
      sendJson(response, error instanceof HttpError ? error.status : 502, {
        error: errorMessage(error),
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/cashouts") {
    try {
      const body = await readJson(request);
      const txHash = requiredString(body, "txHash").toUpperCase();
      if (!/^[0-9a-f]{64}$/i.test(txHash)) {
        sendJson(response, 400, { error: "txHash must be a 64-character transaction hash" });
        return;
      }
      const result = await queue.run(async () => {
        if (await chain.cashoutReferenceUsed(txHash)) {
          return { status: "duplicate" as const };
        }
        const [treasuryAddress, send] = await Promise.all([
          chain.treasuryAddress(),
          chain.getCashoutSend(txHash),
        ]);
        if (!send || send.recipient !== treasuryAddress || !/^[1-9]\d*$/.test(send.amount)) {
          throw new HttpError(
            "transaction must contain one successful MsgSend to the treasury",
          );
        }
        const burn = await chain.burnSynthetic(send.denom, send.amount, txHash);
        return { status: "burned" as const, burnTxHash: burn.txHash };
      });
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, error instanceof HttpError ? error.status : 502, {
        error: errorMessage(error),
      });
    }
    return;
  }

  sendJson(response, 404, { error: "not found" });
}

async function processDeposit(
  payload: DepositPayload,
  chain: CosmosRelayer,
  queue: SerialQueue,
): Promise<DepositResult> {
  const denom = payload.denom;
  if (!isLedgerxAddress(payload.address)) {
    throw new HttpError("address must be a valid ledgerx1 address");
  }
  if (!isSyntheticDenom(denom)) {
    throw new HttpError("denom is not an allowed synthetic denom");
  }
  if (!payload.reference || payload.reference.length > 128) {
    throw new HttpError("reference must contain between 1 and 128 characters");
  }
  let baseAmount: string;
  try {
    baseAmount = majorToBaseUnits(payload.amount);
  } catch (error) {
    throw new HttpError(errorMessage(error));
  }
  return queue.run(async () => {
    if (await chain.depositReferenceUsed(payload.reference)) {
      return { status: "duplicate" };
    }
    const result = await chain.mintSynthetic(
      payload.address,
      denom,
      baseAmount,
      payload.reference,
    );
    return { status: "minted", txHash: result.txHash, height: result.height };
  });
}

async function processSignedDeposit(
  rawBody: Buffer,
  timestamp: string,
  signature: string,
  secret: string,
  chain: CosmosRelayer,
  queue: SerialQueue,
): Promise<
  | { valid: false }
  | { valid: true; result: DepositResult }
> {
  if (!verifyWebhookSignature(secret, timestamp, rawBody, signature).valid) {
    return { valid: false };
  }
  const payload = parseDepositPayload(rawBody.toString("utf8"));
  return { valid: true, result: await processDeposit(payload, chain, queue) };
}

function parseDepositPayload(raw: string): DepositPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError("request body must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError("request body must be a JSON object");
  }
  const body = parsed as Record<string, unknown>;
  return {
    reference: requiredString(body, "reference"),
    address: requiredString(body, "address"),
    denom: requiredString(body, "denom"),
    amount: requiredString(body, "amount"),
  };
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const item = value[key];
  if (typeof item !== "string" || item.length === 0) {
    throw new HttpError(`${key} must be a non-empty string`);
  }
  return item;
}

function isLedgerxAddress(address: string): boolean {
  try {
    return fromBech32(address).prefix === "ledgerx";
  } catch {
    return false;
  }
}

function headerValue(request: IncomingMessage, name: string): string {
  const value = request.headers[name];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function decodePathComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readBody(request);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    throw new HttpError("request body must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError("request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > 1_048_576) {
      throw new HttpError("request body exceeds 1 MiB", 413);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function addCorsHeaders(response: ServerResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "content-type,x-ledgerx-timestamp,x-ledgerx-signature",
  );
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  if (response.writableEnded) {
    return;
  }
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function proxyRpc(
  request: IncomingMessage,
  response: ServerResponse,
  chainRpc: string,
): void {
  const incomingUrl = new URL(request.url ?? "/rpc", "http://relayer.local");
  const suffix = incomingUrl.pathname.replace(/^\/rpc/, "") || "/";
  const upstreamUrl = new URL(`${suffix}${incomingUrl.search}`, chainRpc);
  const transport = upstreamUrl.protocol === "https:" ? httpsRequest : httpRequest;
  const headers = { ...request.headers };
  delete headers.host;
  delete headers.origin;
  delete headers.connection;
  const upstream = transport(
    upstreamUrl,
    { method: request.method, headers },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );
  upstream.on("error", () => {
    if (!response.headersSent) {
      sendJson(response, 502, { error: "chain RPC unavailable" });
    } else {
      response.destroy();
    }
  });
  request.pipe(upstream);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unexpected relayer error";
}
