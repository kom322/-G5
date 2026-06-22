// safetyScoreRefactored.js — 安全スコア計算
//
// 【採点基準 — 100点満点（正規化）】
//   レビュー評価 : 最大50点（4.5以上→50点 / 4.0以上→35点 / 3.5以上→20点 / 3.0以上→8点）
//   レビュー件数 : 最大30点（100件以上→30点 / 30件以上→20点 / 5件以上→10点 / 1件以上→4点）
//   公式ショップ :     20点（ショップ名に「公式」「直営」を含む場合）
//   送料無料     :      5点（送料 = 0円）
//   返品保証     :     10点（保証情報が取得できた場合のみ採点対象に含める）
//     ※ 返品情報が null（不明）の場合は上記4項目の合計105点で正規化
//     ※ 返品情報が取得できた場合は合計115点で正規化 → どちらも100点満点に換算
//
// 【ペナルティ（正規化後に固定減点）】
//   中古・訳あり: -15点（商品名に中古・訳あり・ジャンク等を含む）
//
// 【ラベル基準】
//   安心: 65点以上 / 普通: 35点以上 / 注意: 35点未満

const RATING_SCORE = [
  { min: 4.5, pts: 50 },
  { min: 4.0, pts: 35 },
  { min: 3.5, pts: 20 },
  { min: 3.0, pts:  8 },
];

const REVIEW_COUNT_SCORE = [
  { min: 100, pts: 30 },
  { min:  30, pts: 20 },
  { min:   5, pts: 10 },
  { min:   1, pts:  4 },
];

// 返品保証が不明（null）の場合は除外して残り4項目の合計で正規化する
const BASE_MAX    = 105; // 評価50 + 件数30 + 公式20 + 送料5
const RETURN_WEIGHT = 10;

const USED_WORDS = ["中古", "訳あり", "ジャンク", "used", "Used", "USED"];

export function calcSafetyScore(item) {
  let raw = 0;

  // レビュー評価（最大50点）
  const ratingEntry = RATING_SCORE.find(r => item.rating >= r.min);
  if (ratingEntry) raw += ratingEntry.pts;

  // レビュー件数（最大30点）
  const countEntry = REVIEW_COUNT_SCORE.find(r => item.reviewCount >= r.min);
  if (countEntry) raw += countEntry.pts;

  // 公式ショップ（20点）
  if (item.isOfficial) raw += 20;

  // 送料無料（5点）
  if (item.shipping === 0) raw += 5;

  // 返品保証（情報が取得できた場合のみ採点対象に加える）
  const hasReturnInfo = item.hasReturnPolicy !== null && item.hasReturnPolicy !== undefined;
  const maxRaw = hasReturnInfo ? BASE_MAX + RETURN_WEIGHT : BASE_MAX;
  if (hasReturnInfo && item.hasReturnPolicy) raw += RETURN_WEIGHT;

  // 正規化: 採点可能な最大素点で割って100点満点に換算
  let score = maxRaw > 0 ? Math.round(raw / maxRaw * 100) : 0;

  // 中古ペナルティ（正規化後に固定減点）
  if (USED_WORDS.some(w => (item.name || "").includes(w))) score -= 15;

  return Math.max(0, Math.min(100, score));
}

export function getSafetyLabel(score) {
  if (score >= 65) return "安心";
  if (score >= 35) return "普通";
  return "注意";
}

export function getWarnings(item) {
  const warnings = [];
  if (!item.isOfficial)                            warnings.push("公式ショップではない");
  if (item.reviewCount === 0)                      warnings.push("レビューなし");
  else if (item.reviewCount < 30)                  warnings.push("レビュー少ない");
  else                                             warnings.push("レビュー多い");
  if (item.rating > 0 && item.rating < 3.5)        warnings.push("レビュー評価が低い");
  if (USED_WORDS.some(w => (item.name || "").includes(w))) warnings.push("中古・訳あり品");
  if (item.shipping === 0)                         warnings.push("送料無料");
  if (item.hasReturnPolicy === true)               warnings.push("返品保証あり");
  return warnings;
}
