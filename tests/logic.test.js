import { describe, it, expect } from "vitest";
import { calcActualPrice } from "../src/logic.js";

describe("calcActualPrice", () => {
  it("送料無料の場合、価格がそのまま実質価格になる", () => {
    expect(calcActualPrice(3980, 0)).toBe(3980);
  });

  it("送料がある場合、価格＋送料が実質価格になる", () => {
    expect(calcActualPrice(3600, 550)).toBe(4150);
  });
});
