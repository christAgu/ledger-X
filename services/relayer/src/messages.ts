import { Registry } from "@cosmjs/proto-signing";
import type { GeneratedType } from "@cosmjs/proto-signing";
import { BinaryReader, BinaryWriter } from "cosmjs-types/binary.js";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin.js";

export const MINT_SYNTHETIC_TYPE_URL = "/ledgerx.treasury.v1.MsgMintSynthetic";
export const BURN_SYNTHETIC_TYPE_URL = "/ledgerx.treasury.v1.MsgBurnSynthetic";

export interface MsgMintSynthetic {
  authority: string;
  recipient: string;
  amount: Coin;
  depositRef: string;
}

export interface MsgBurnSynthetic {
  authority: string;
  amount: Coin;
  cashoutRef: string;
}

export function encodeMsgMintSynthetic(message: MsgMintSynthetic): Uint8Array {
  return encodeMintToWriter(message, BinaryWriter.create()).finish();
}

function encodeMintToWriter(
  message: MsgMintSynthetic,
  writer = BinaryWriter.create(),
): BinaryWriter {
  writer.uint32(10).string(message.authority);
  writer.uint32(18).string(message.recipient);
  writer.uint32(26).bytes(Coin.encode(message.amount).finish());
  writer.uint32(34).string(message.depositRef);
  return writer;
}

export function decodeMsgMintSynthetic(input: Uint8Array): MsgMintSynthetic {
  const reader = new BinaryReader(input);
  const message: MsgMintSynthetic = {
    authority: "",
    recipient: "",
    amount: Coin.fromPartial({}),
    depositRef: "",
  };
  while (reader.pos < reader.len) {
    const tag = reader.uint32();
    switch (tag >>> 3) {
      case 1:
        message.authority = reader.string();
        break;
      case 2:
        message.recipient = reader.string();
        break;
      case 3:
        message.amount = Coin.decode(reader.bytes());
        break;
      case 4:
        message.depositRef = reader.string();
        break;
      default:
        reader.skipType(tag & 7);
    }
  }
  return message;
}

export function encodeMsgBurnSynthetic(message: MsgBurnSynthetic): Uint8Array {
  return encodeBurnToWriter(message, BinaryWriter.create()).finish();
}

function encodeBurnToWriter(
  message: MsgBurnSynthetic,
  writer = BinaryWriter.create(),
): BinaryWriter {
  writer.uint32(10).string(message.authority);
  writer.uint32(18).bytes(Coin.encode(message.amount).finish());
  writer.uint32(26).string(message.cashoutRef);
  return writer;
}

export function decodeMsgBurnSynthetic(input: Uint8Array): MsgBurnSynthetic {
  const reader = new BinaryReader(input);
  const message: MsgBurnSynthetic = {
    authority: "",
    amount: Coin.fromPartial({}),
    cashoutRef: "",
  };
  while (reader.pos < reader.len) {
    const tag = reader.uint32();
    switch (tag >>> 3) {
      case 1:
        message.authority = reader.string();
        break;
      case 2:
        message.amount = Coin.decode(reader.bytes());
        break;
      case 3:
        message.cashoutRef = reader.string();
        break;
      default:
        reader.skipType(tag & 7);
    }
  }
  return message;
}

export const MsgMintSyntheticType = {
  encode: encodeMintToWriter,
  decode: decodeMsgMintSynthetic,
  fromPartial: (message: Partial<MsgMintSynthetic>): MsgMintSynthetic => ({
    authority: message.authority ?? "",
    recipient: message.recipient ?? "",
    amount: Coin.fromPartial(message.amount ?? {}),
    depositRef: message.depositRef ?? "",
  }),
};

export const MsgBurnSyntheticType = {
  encode: encodeBurnToWriter,
  decode: decodeMsgBurnSynthetic,
  fromPartial: (message: Partial<MsgBurnSynthetic>): MsgBurnSynthetic => ({
    authority: message.authority ?? "",
    amount: Coin.fromPartial(message.amount ?? {}),
    cashoutRef: message.cashoutRef ?? "",
  }),
};

export function createRegistry(
  defaultTypes: Iterable<[string, GeneratedType]>,
): Registry {
  return new Registry([
    ...defaultTypes,
    [MINT_SYNTHETIC_TYPE_URL, MsgMintSyntheticType],
    [BURN_SYNTHETIC_TYPE_URL, MsgBurnSyntheticType],
  ]);
}
