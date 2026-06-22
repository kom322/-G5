import { describe, it, expect } from "vitest";
import { calcSafetyScore, getSafetyLabel, getWarnings } from "../src/safetyScoreRefactored.js";

// 採点基準: rating最大50点 + reviewCount最大30点 + isOfficial 20点 = 計100点
const goodShop = {
  rating: 4.6, reviewCount: 520, isOfficial: true,
};
const normalShop = {
  rating: 3.8, reviewCount: 42, isOfficial: false,
};
const riskyShop = {
  rating: 3.0, reviewCount: 0, isOfficial: false,
};

describe("calcSafetyScore", () => {
  it("高評価・大量レビュー・公式は最高点 100点", () => {
    // rating(50) + reviewCount(30) + official(20) = 100
    expect(calcSafetyScore(goodShop)).toBe(100);
  });

  it("中評価・少なめレビュー・非公式は中程度 40点", () => {
    // rating(20) + reviewCount(20) + official(0) = 40
    expect(calcSafetyScore(normalShop)).toBe(40);
  });

  it("低評価・レビューなし・非公式は低得点 8点", () => {
    // rating(8) + reviewCount(0) + official(0) = 8
    expect(calcSafetyScore(riskyShop)).toBe(8);
  });
});

describe("getSafetyLabel", () => {
  it("65点以上は「安心」", () => {
    expect(getSafetyLabel(100)).toBe("安心");
    expect(getSafetyLabel(65)).toBe("安心");
  });

  it("35〜64点は「普通」", () => {
    expect(getSafetyLabel(40)).toBe("普通");
    expect(getSafetyLabel(35)).toBe("普通");
  });

  it("35点未満は「注意」", () => {
    expect(getSafetyLabel(34)).toBe("注意");
    expect(getSafetyLabel(8)).toBe("注意");
  });
});

describe("getWarnings", () => {
  it("公式・レビュー多いショップは良い評価", () => {
    const w = getWarnings(goodShop);
    expect(w).not.toContain("公式ショップではない");
    expect(w).toContain("レビュー多い");
  });

  it("非公式・レビューなし・低評価ショップは複数警告", () => {
    const w = getWarnings(riskyShop);
    expect(w).toContain("公式ショップではない");
    expect(w).toContain("レビューなし");
    expect(w).toContain("レビュー評価が低い");
  });
});
