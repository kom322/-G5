import { describe, it, expect } from "vitest";
import { calcActualPrice, findCheapest, listActualPrices } from "../src/logic.js";

const testSites = {
  Amazon:  { price: 3980, shipping: 0   },
  Rakuten: { price: 3600, shipping: 550 }, // 実質 4150円
  Yahoo:   { price: 3750, shipping: 0   },
};

describe("calcActualPrice", () => {
  it("送料無料の場合、価格がそのまま実質価格になる", () => {
    expect(calcActualPrice(3980, 0)).toBe(3980);
  });

  it("送料がある場合、価格＋送料が実質価格になる", () => {
    expect(calcActualPrice(3600, 550)).toBe(4150);
  });
});

describe("findCheapest", () => {
  it("実質価格が最も安いサイトを返す", () => {
    const result = findCheapest(testSites);
    // Yahoo 3750円（送料0）が最安
    expect(result.name).toBe("Yahoo");
    expect(result.actualPrice).toBe(3750);
  });
});

describe("listActualPrices", () => {
  it("安い順に並べて返す", () => {
    const result = listActualPrices(testSites);
    // Yahoo(3750) < Amazon(3980) < Rakuten(4150)
    expect(result[0].site).toBe("Yahoo");
    expect(result[0].actualPrice).toBe(3750);
    expect(result[2].site).toBe("Rakuten");
    expect(result[2].actualPrice).toBe(4150);
  });
});
