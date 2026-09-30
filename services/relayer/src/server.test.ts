import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { RelayerConfig } from "./config.js";
import type { CosmosRelayer } from "./cosmos.js";
import { createRelayerServer } from "./server.js";

describe("relayer configuration, deposits, and REST proxy", () => {
  let relayerServer: Server | undefined;
  let upstreamServer: Server | undefined;
  let dataDir: string | undefined;

  afterEach(async () => {
    if (relayerServer) await close(relayerServer);
    if (upstreamServer) await close(upstreamServer);
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
    relayerServer = undefined;
    upstreamServer = undefined;
    dataDir = undefined;
  });

  it("returns chain configuration and forwards REST paths and query strings", async () => {
    let forwardedUrl = "";
    upstreamServer = createServer((request, response) => {
      forwardedUrl = request.url ?? "";
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ forwardedUrl }));
    });
    const upstreamBase = await listen(upstreamServer);
    dataDir = await mkdtemp(join(tmpdir(), "ledgerx-relayer-test-"));
    const config: RelayerConfig = {
      port: 0,
      chainRpc: "http://127.0.0.1:26657",
      chainApi: upstreamBase,
      chainId: "ledgerx-devnet-1",
      treasuryMnemonic: "",
      webhookSecret: "test-secret",
      sandbox: true,
      dataDir,
    };
    const chain = {
      treasuryAddress: async () => "ledgerx1s39200s6v4c96ml2xzuh389yxpd0guk29xkwk6",
      depositReferenceUsed: async () => false,
      mintEurc: async () => ({ txHash: "D".repeat(64), height: 42 }),
    } as unknown as CosmosRelayer;
    relayerServer = await createRelayerServer(config, chain);
    const relayerBase = await listen(relayerServer);

    const configResponse = await fetch(`${relayerBase}/v1/config`);
    expect(configResponse.status).toBe(200);
    await expect(configResponse.json()).resolves.toEqual({
      chainId: "ledgerx-devnet-1",
      treasuryAddress: "ledgerx1s39200s6v4c96ml2xzuh389yxpd0guk29xkwk6",
      denom: "ueurc",
      xofPerEur: "655.957",
    });

    const restResponse = await fetch(
      `${relayerBase}/rest/cosmos/bank/v1beta1/balances/test-address?pagination.limit=1`,
    );
    expect(restResponse.status).toBe(200);
    await expect(restResponse.json()).resolves.toEqual({
      forwardedUrl: "/cosmos/bank/v1beta1/balances/test-address?pagination.limit=1",
    });
    expect(forwardedUrl).toBe(
      "/cosmos/bank/v1beta1/balances/test-address?pagination.limit=1",
    );

    const depositResponse = await fetch(`${relayerBase}/v1/sandbox/deposit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address: "ledgerx1s39200s6v4c96ml2xzuh389yxpd0guk29xkwk6",
        currency: "XOF",
        amount: "5000",
      }),
    });
    expect(depositResponse.status).toBe(200);
    const deposit = await depositResponse.json();
    expect(deposit).toMatchObject({
      status: "minted",
      txHash: "D".repeat(64),
      height: 42,
      credited: { denom: "ueurc", amount: "7622450" },
    });

    const invalidDepositResponse = await fetch(`${relayerBase}/v1/sandbox/deposit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        address: "ledgerx1s39200s6v4c96ml2xzuh389yxpd0guk29xkwk6",
        currency: "USD",
        amount: "5",
      }),
    });
    expect(invalidDepositResponse.status).toBe(400);
  });
});

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("test server did not bind to a TCP port");
  }
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
