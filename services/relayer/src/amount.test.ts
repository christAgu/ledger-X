import { describe, expect, it } from "vitest";
import { majorToBaseUnits } from "./amount.js";

describe("majorToBaseUnits", () => {
  it("converts decimal major units exactly", () => {
    expect(majorToBaseUnits("0.5")).toBe("500000");
    expect(majorToBaseUnits("5000")).toBe("5000000000");
    expect(majorToBaseUnits("1.000001")).toBe("1000001");
  });

  it.each(["1e3", "-1", "0", "1.0000001", " 1"])("rejects %s", (amount) => {
    expect(() => majorToBaseUnits(amount)).toThrow();
  });
});
