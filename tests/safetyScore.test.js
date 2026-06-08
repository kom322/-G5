import { describe, it, expect } from "vitest";
import { calcSafetyScore, getSafetyLabel, rankBySafety } from "../src/safetyScore.js";

const goodShop = {
  price: 3750, shipping: 0,
  rating: 4.6, reviewCount: 520,
  hasReturnPolicy: true, isOfficial: true,
};

const riskyShop = {
  price: 3600, shipping: 550,
  rating: 3.8, reviewCount: 42,
  hasReturnPolicy: false, isOfficial: false,
};

describe("calcSafetyScore", () => {
  it("条件が良いショップは高得点になる", () => {
    const score = calcSafetyScore(goodShop);
    // rating(30) + reviewCount(20) + returnPolicy(20) + official(20) + shipping(10) = 100
    expect(score).toBe(100);
  });

  it("条件が悪いショップは低得点になる", () => {
    const score = calcSafetyScore(riskyShop);
    // rating(10) + reviewCount(5) + returnPolicy(0) + official(0) + shipping(0) = 15
    expect(score).toBe(15);
  });
});

describe("getSafetyLabel", () => {
  it("80点以上は「安心」", () => {
    expect(getSafetyLabel(100)).toBe("安心");
    expect(getSafetyLabel(80)).toBe("安心");
  });

  it("60〜79点は「普通」", () => {
    expect(getSafetyLabel(70)).toBe("普通");
    expect(getSafetyLabel(60)).toBe("普通");
  });

  it("59点以下は「注意」", () => {
    expect(getSafetyLabel(59)).toBe("注意");
    expect(getSafetyLabel(15)).toBe("注意");
  });
});

describe("rankBySafety", () => {
  it("スコードの高い順に並べる", () => {
    const sites = { Yahoo: goodShop, Rakuten: riskyShop };
    const result = rankBySafety(sites);
    expect(result[0].site).toBe("Yahoo");
    expect(result[0].score).toBe(100);
    expect(result[1].site).toBe("Rakuten");
  });
});
