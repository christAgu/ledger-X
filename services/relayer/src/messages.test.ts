import { describe, expect, it } from "vitest";
import {
  decodeMsgBurnSynthetic,
  decodeMsgMintSynthetic,
  encodeMsgBurnSynthetic,
  encodeMsgMintSynthetic,
} from "./messages.js";

describe("EURC treasury message encoding", () => {
  it("encodes and decodes MsgMintSynthetic with the expected protobuf bytes", () => {
    const message = {
      authority: "a",
      recipient: "b",
      amount: { denom: "ueurc", amount: "5000000000" },
      depositRef: "r",
    };
    const encoded = encodeMsgMintSynthetic(message);
    expect(Buffer.from(encoded).toString("hex")).toBe(
      "0a01611201621a130a057565757263120a35303030303030303030220172",
    );
    expect(decodeMsgMintSynthetic(encoded)).toEqual(message);
  });

  it("encodes and decodes MsgBurnSynthetic with the expected protobuf bytes", () => {
    const message = {
      authority: "a",
      amount: { denom: "ueurc", amount: "500000000" },
      cashoutRef: "tx",
    };
    const encoded = encodeMsgBurnSynthetic(message);
    expect(Buffer.from(encoded).toString("hex")).toBe(
      "0a016112120a05756575726312093530303030303030301a027478",
    );
    expect(decodeMsgBurnSynthetic(encoded)).toEqual(message);
  });
});
