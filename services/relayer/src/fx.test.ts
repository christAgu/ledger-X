import { describe, expect, it } from "vitest";
import { eurcBaseUnitsToXof, XOF_PER_EUR, xofToEurcBaseUnits } from "./fx.js";

describe("EURC and XOF conversion", () => {
  it("converts XOF to EURC base units at the fixed peg", () => {
    expect(XOF_PER_EUR).toBe("655.957");
    expect(xofToEurcBaseUnits("327979")).toBe("500000762");
    expect(xofToEurcBaseUnits("655957")).toBe("1000000000");
    expect(xofToEurcBaseUnits("5000")).toBe("7622450");
  });

  it("converts EURC base units to XOF", () => {
    expect(eurcBaseUnitsToXof("500000000")).toBe("327978");
  });

  it.each(["1.5", "0", "abc"])("rejects invalid XOF amount %s", (amount) => {
    expect(() => xofToEurcBaseUnits(amount)).toThrow();
  });
});
