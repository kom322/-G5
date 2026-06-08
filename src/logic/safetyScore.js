// safetyScore.js — 安全スコア計算（あなたの担当ファイル②）
//
// 【採点基準 — 100点満点】
//   レビュー評価   : 最大30点（星が高いほど安心）
//   レビュー件数   : 最大20点（件数が多いほど信頼できる）
//   返品保証あり   :     20点（返品できるなら安心）
//   公式ショップ   :     20点（メーカー公式は偽物リスクが低い）
//   送料無料       :     10点（追加料金なしは親切）
//                          計 100点
//
// ★ リファクタリング前のバージョン（複雑度が高い）
//   → 発表で「Before」として見せる部分

/**
 * ショップの安全スコアを計算する（0〜100点）
 */
export function calcSafetyScore(siteData) {
  let score = 0;

  // ── レビュー評価（最大30点） ──────────────────────
  if (siteData.rating >= 4.5) {
    score += 30;
  } else if (siteData.rating >= 4.0) {
    score += 20;
  } else if (siteData.rating >= 3.5) {
    score += 10;
  }
  // 3.5未満は 0点

  // ── レビュー件数（最大20点） ──────────────────────
  if (siteData.reviewCount >= 500) {
    score += 20;
  } else if (siteData.reviewCount >= 100) {
    score += 10;
  } else if (siteData.reviewCount >= 10) {
    score += 5;
  }
  // 10件未満は 0点

  // ── 返品保証（20点） ─────────────────────────────
  if (siteData.hasReturnPolicy) {
    score += 20;
  }

  // ── 公式ショップ（20点） ──────────────────────────
  if (siteData.isOfficial) {
    score += 20;
  }

  // ── 送料無料（10点） ─────────────────────────────
  if (siteData.shipping === 0) {
    score += 10;
  }

  return score;
}

/**
 * 安全スコアに応じたラベルを返す
 */
export function getSafetyLabel(score) {
  if (score >= 80) return "安心";
  if (score >= 60) return "普通";
  return "注意";
}

/**
 * スコアが低い理由を文字列の配列で返す
 */
export function getWarnings(siteData) {
  const warnings = [];

  if (!siteData.isOfficial)        warnings.push("公式ショップではない");
  if (!siteData.hasReturnPolicy)   warnings.push("返品保証がない");
  if (siteData.reviewCount < 10)   warnings.push("レビューがほぼない");
  else if (siteData.reviewCount < 100) warnings.push("レビュー件数が少ない");
  if (siteData.rating < 3.5)       warnings.push("レビュー評価が低い");
  if (siteData.shipping > 0)       warnings.push(`送料 ${siteData.shipping.toLocaleString()}円 かかる`);

  return warnings;
}

/**
 * 全サイトの安全スコアをスコア順に並べて返す
 */
export function rankBySafety(sites) {
  const results = Object.entries(sites).map(([siteName, siteData]) => {
    const score = calcSafetyScore(siteData);
    return {
      site: siteName,
      score,
      label: getSafetyLabel(score),
      warnings: getWarnings(siteData),
    };
  });
  results.sort((a, b) => b.score - a.score);
  return results;
}
