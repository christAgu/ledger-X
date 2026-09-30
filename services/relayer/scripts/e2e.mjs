import "dotenv/config";
import { createHmac } from "node:crypto";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice, SigningStargateClient } from "@cosmjs/stargate";

const relayerUrl = process.env.RELAYER_URL ?? "http://127.0.0.1:8787";
const chainRpc = process.env.CHAIN_RPC ?? "http://localhost:26657";
const chainApi = process.env.CHAIN_API ?? "http://localhost:1317";
const chainId = process.env.CHAIN_ID ?? "ledgerx-devnet-1";
const treasuryMnemonic = process.env.TREASURY_MNEMONIC ?? "";
const webhookSecret = process.env.WEBHOOK_SECRET ?? "";
const koffiAddress = process.env.KOFFI_ADDRESS ?? "";

if (!treasuryMnemonic || !webhookSecret || !koffiAddress) {
  throw new Error("TREASURY_MNEMONIC, WEBHOOK_SECRET, and KOFFI_ADDRESS are required");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(path, body, headers = {}) {
  const response = await fetch(`${relayerUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${JSON.stringify(result)}`);
  }
  return result;
}

async function querySupply(denom) {
  const response = await fetch(
    `${chainApi}/cosmos/bank/v1beta1/supply/by_denom?denom=${encodeURIComponent(denom)}`,
  );
  assert(response.ok, `supply query failed: ${response.status}`);
  const data = await response.json();
  return BigInt(data.amount.amount);
}

const wallet = await DirectSecp256k1HdWallet.generate(12, { prefix: "ledgerx" });
const [account] = await wallet.getAccounts();
assert(account, "fresh wallet did not produce an account");
const tag = `e2e_${Date.now().toString(36)}`;
const registration = await requestJson("/v1/accounts", {
  address: account.address,
  tag,
  phone: "+225000000000",
});
assert(registration.address === account.address, "account registration address mismatch");
console.log(`registered ${tag}: ${account.address}`);

const client = await SigningStargateClient.connectWithSigner(chainRpc, wallet, {
  gasPrice: GasPrice.fromString("0.0025uledx"),
});
try {
assert((await client.getChainId()) === chainId, `connected to unexpected chain`);
assert((await client.getBalance(account.address, "uledx")).amount === "0", "user has uledx");

const treasuryWallet = await DirectSecp256k1HdWallet.fromMnemonic(treasuryMnemonic, {
  prefix: "ledgerx",
});
const [treasury] = await treasuryWallet.getAccounts();
assert(treasury, "treasury mnemonic did not produce an account");
const fee = {
  amount: [{ denom: "uledx", amount: "1500" }],
  gas: "600000",
  granter: treasury.address,
};
const koffiBalanceBefore = BigInt((await client.getBalance(koffiAddress, "aXOF")).amount);

const deposit = await requestJson("/v1/sandbox/deposit", {
  address: account.address,
  denom: "aXOF",
  amount: "5000",
  rail: "mtn_momo",
});
assert(deposit.status === "minted", "sandbox deposit was not minted");
assert((await client.getBalance(account.address, "aXOF")).amount === "5000000000", "deposit balance mismatch");
console.log(`sandbox deposit minted: ${deposit.txHash}`);

const sendToKoffi = await client.sendTokens(
  account.address,
  koffiAddress,
  [{ denom: "aXOF", amount: "1000000000" }],
  fee,
  "Ledger X e2e transfer",
);
assert(sendToKoffi.code === 0, "feegrant transfer to Koffi failed");
assert((await client.getBalance(account.address, "uledx")).amount === "0", "user gained uledx");
const koffiBalanceAfter = BigInt((await client.getBalance(koffiAddress, "aXOF")).amount);
assert(koffiBalanceAfter - koffiBalanceBefore === 1_000_000_000n, "Koffi balance mismatch");
console.log(`1000 XOF sent to Koffi with zero uledx: ${sendToKoffi.transactionHash}`);

const supplyBefore = await querySupply("aXOF");
const sendToTreasury = await client.sendTokens(
  account.address,
  treasury.address,
  [{ denom: "aXOF", amount: "500000000" }],
  fee,
  "Ledger X cashout e2e",
);
assert(sendToTreasury.code === 0, "transfer to treasury failed");
const cashout = await requestJson("/v1/cashouts", {
  txHash: sendToTreasury.transactionHash,
  rail: "mtn_momo",
  destination: "+225000000000",
});
assert(cashout.status === "burned", "cashout was not burned");
const supplyAfter = await querySupply("aXOF");
assert(supplyBefore - supplyAfter === 500000000n, "cashout did not reduce supply by 500 XOF");
console.log(`cashout burned 500 XOF: ${cashout.burnTxHash}`);

const replayBody = JSON.stringify({
  reference: deposit.reference,
  address: account.address,
  denom: "aXOF",
  amount: "5000",
});
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac("sha256", webhookSecret)
  .update(`${timestamp}.${replayBody}`)
  .digest("hex");
const replayResponse = await fetch(`${relayerUrl}/v1/webhooks/deposit`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-ledgerx-timestamp": timestamp,
    "x-ledgerx-signature": signature,
  },
  body: replayBody,
});
const replay = await replayResponse.json();
assert(replayResponse.ok && replay.status === "duplicate", "webhook replay was not idempotent");
console.log(`webhook replay: ${replay.status}`);
} finally {
  client.disconnect();
}
