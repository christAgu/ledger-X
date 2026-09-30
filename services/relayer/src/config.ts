import "dotenv/config";
import { resolve } from "node:path";

export interface RelayerConfig {
  port: number;
  chainRpc: string;
  chainApi: string;
  chainId: string;
  treasuryMnemonic: string;
  webhookSecret: string;
  sandbox: boolean;
  dataDir: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): RelayerConfig {
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }

  return {
    port,
    chainRpc: env.CHAIN_RPC ?? "http://localhost:26657",
    chainApi: env.CHAIN_API ?? "http://localhost:1317",
    chainId: env.CHAIN_ID ?? "ledgerx-devnet-1",
    treasuryMnemonic: env.TREASURY_MNEMONIC?.trim() ?? "",
    webhookSecret: env.WEBHOOK_SECRET ?? "",
    sandbox: env.SANDBOX === "1",
    dataDir: resolve(env.DATA_DIR ?? "./data"),
  };
}

export const config = readConfig();
