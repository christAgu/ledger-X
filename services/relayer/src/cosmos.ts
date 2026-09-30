import { decodeTxRaw, DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice, SigningStargateClient, defaultRegistryTypes } from "@cosmjs/stargate";
import { connectComet } from "@cosmjs/tendermint-rpc";
import { Any } from "cosmjs-types/google/protobuf/any.js";
import { AllowedMsgAllowance, PeriodicAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant.js";
import { MsgGrantAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx.js";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx.js";
import { RelayerConfig } from "./config.js";
import {
  BURN_SYNTHETIC_TYPE_URL,
  createRegistry,
  MINT_SYNTHETIC_TYPE_URL,
} from "./messages.js";

export const SYNTHETIC_DENOMS = ["aXOF", "aEUR", "aUSD"] as const;
export type SyntheticDenom = (typeof SYNTHETIC_DENOMS)[number];

export interface BroadcastResult {
  txHash: string;
  height: number;
}

export interface CashoutSend {
  sender: string;
  recipient: string;
  denom: SyntheticDenom;
  amount: string;
}

export class CosmosRelayer {
  private signerPromise?: Promise<{
    client: SigningStargateClient;
    address: string;
  }>;

  constructor(private readonly config: RelayerConfig) {}

  async health(): Promise<{ ok: boolean; height: number }> {
    const client = await connectComet(this.config.chainRpc);
    try {
      const status = await client.status();
      return {
        ok: status.nodeInfo.network === this.config.chainId,
        height: status.syncInfo.latestBlockHeight,
      };
    } finally {
      client.disconnect();
    }
  }

  async treasuryAddress(): Promise<string> {
    return (await this.signer()).address;
  }

  async depositReferenceUsed(reference: string): Promise<boolean> {
    return this.referenceUsed("deposit_ref", reference);
  }

  async cashoutReferenceUsed(reference: string): Promise<boolean> {
    return this.referenceUsed("cashout_ref", reference);
  }

  async grantFeeAllowance(grantee: string): Promise<BroadcastResult> {
    const { client, address } = await this.signer();
    const periodic = PeriodicAllowance.fromPartial({
      basic: { spendLimit: [] },
      period: { seconds: 86_400n, nanos: 0 },
      periodSpendLimit: [{ denom: "uledx", amount: "5000000" }],
    });
    const periodicAny = Any.fromPartial({
      typeUrl: PeriodicAllowance.typeUrl,
      value: PeriodicAllowance.encode(periodic).finish(),
    });
    const allowed = AllowedMsgAllowance.fromPartial({
      allowance: periodicAny,
      allowedMessages: ["/cosmos.bank.v1beta1.MsgSend"],
    });
    const allowance = Any.fromPartial({
      typeUrl: AllowedMsgAllowance.typeUrl,
      value: AllowedMsgAllowance.encode(allowed).finish(),
    });
    const message = MsgGrantAllowance.fromPartial({
      granter: address,
      grantee,
      allowance,
    });
    return this.broadcast(client, address, [
      { typeUrl: MsgGrantAllowance.typeUrl, value: message },
    ]);
  }

  async mintSynthetic(
    recipient: string,
    denom: SyntheticDenom,
    amount: string,
    depositRef: string,
  ): Promise<BroadcastResult> {
    const { client, address } = await this.signer();
    return this.broadcast(client, address, [
      {
        typeUrl: MINT_SYNTHETIC_TYPE_URL,
        value: {
          authority: address,
          recipient,
          amount: { denom, amount },
          depositRef,
        },
      },
    ]);
  }

  async burnSynthetic(
    denom: SyntheticDenom,
    amount: string,
    cashoutRef: string,
  ): Promise<BroadcastResult> {
    const { client, address } = await this.signer();
    return this.broadcast(client, address, [
      {
        typeUrl: BURN_SYNTHETIC_TYPE_URL,
        value: {
          authority: address,
          amount: { denom, amount },
          cashoutRef,
        },
      },
    ]);
  }

  async getCashoutSend(txHash: string): Promise<CashoutSend | undefined> {
    const { client } = await this.signer();
    const tx = await client.getTx(txHash.toUpperCase());
    if (!tx || tx.code !== 0) {
      return undefined;
    }

    const body = decodeTxRaw(tx.tx).body;
    if (body.messages.length !== 1 || body.messages[0]?.typeUrl !== MsgSend.typeUrl) {
      return undefined;
    }

    const message = MsgSend.decode(body.messages[0].value);
    if (message.amount.length !== 1) {
      return undefined;
    }
    const coin = message.amount[0];
    if (!coin || !isSyntheticDenom(coin.denom)) {
      return undefined;
    }
    return {
      sender: message.fromAddress,
      recipient: message.toAddress,
      denom: coin.denom,
      amount: coin.amount,
    };
  }

  private async referenceUsed(kind: "deposit_ref" | "cashout_ref", reference: string) {
    const response = await fetch(
      `${this.config.chainApi.replace(/\/$/, "")}/ledgerx/treasury/v1/${kind}/${encodeURIComponent(reference)}`,
    );
    if (!response.ok) {
      throw new Error(`Could not query treasury reference (${response.status})`);
    }
    const data = (await response.json()) as { used?: boolean };
    return data.used === true;
  }

  private async signer(): Promise<{ client: SigningStargateClient; address: string }> {
    if (!this.config.treasuryMnemonic) {
      throw new Error("TREASURY_MNEMONIC is required for treasury broadcasts");
    }
    this.signerPromise ??= this.createSigner().catch((error: unknown) => {
      this.signerPromise = undefined;
      throw error;
    });
    return this.signerPromise;
  }

  private async createSigner(): Promise<{
    client: SigningStargateClient;
    address: string;
  }> {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.config.treasuryMnemonic, {
      prefix: "ledgerx",
    });
    const [account] = await wallet.getAccounts();
    if (!account) {
      throw new Error("The treasury mnemonic did not produce an account");
    }
    const registry = createRegistry(defaultRegistryTypes);
    const client = await SigningStargateClient.connectWithSigner(
      this.config.chainRpc,
      wallet,
      {
        registry,
        gasPrice: GasPrice.fromString("0.0025uledx"),
      },
    );
    const actualChainId = await client.getChainId();
    if (actualChainId !== this.config.chainId) {
      client.disconnect();
      throw new Error(`Expected chain ${this.config.chainId}, connected to ${actualChainId}`);
    }
    return { client, address: account.address };
  }

  private async broadcast(
    client: SigningStargateClient,
    signerAddress: string,
    messages: Parameters<SigningStargateClient["signAndBroadcast"]>[1],
  ): Promise<BroadcastResult> {
    const result = await client.signAndBroadcast(signerAddress, messages, "auto");
    if (result.code !== 0) {
      throw new Error(`Treasury transaction failed: ${result.rawLog ?? result.code}`);
    }
    return { txHash: result.transactionHash, height: result.height };
  }
}

export function isSyntheticDenom(value: string): value is SyntheticDenom {
  return SYNTHETIC_DENOMS.includes(value as SyntheticDenom);
}
