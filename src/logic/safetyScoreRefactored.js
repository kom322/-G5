// safetyScoreRefactored.js — 安全スコア計算（リファクタリング後）
//
// ★ 発表で「After」として見せる部分
//
// Before との違い:
//   calcSafetyScore の中に全条件が入っていたのを、
//   役割ごとに小さな関数に分割した。
//   → 循環的複雑度が下がり、読みやすくなる。

// 各項目の採点ルール（ヘルパー関数）

export function scoreRating(rating) {
  if (rating >= 4.5) return 30;
  if (rating >= 4.0) return 20;
  if (rating >= 3.5) return 10;
  return 0;
}

export function scoreReviewCount(reviewCount) {
  if (reviewCount >= 500) return 20;
  if (reviewCount >= 100) return 10;
  if (reviewCount >= 10) return 5;
  return 0;
}

export function scoreReturnPolicy(hasReturnPolicy) {
  return hasReturnPolicy ? 20 : 0;
}

export function scoreOfficial(isOfficial) {
  return isOfficial ? 20 : 0;
}

export function scoreShipping(shipping) {
  return shipping === 0 ? 10 : 0;
}

// メイン関数（リファクタリング後は足し算だけ — とてもシンプル）
export function calcSafetyScore(siteData) {
  return (
    scoreRating(siteData.rating) +
    scoreReviewCount(siteData.reviewCount) +
    scoreReturnPolicy(siteData.hasReturnPolicy) +
    scoreOfficial(siteData.isOfficial) +
    scoreShipping(siteData.shipping)
  );
}

export function getSafetyLabel(score) {
  if (score >= 80) return "安心";
  if (score >= 60) return "普通";
  return "注意";
}

export function rankBySafety(sites) {
  return Object.entries(sites)
    .map(([siteName, siteData]) => {
      const score = calcSafetyScore(siteData);
      return { site: siteName, score, label: getSafetyLabel(score) };
    })
    .sort((a, b) => b.score - a.score);
}
