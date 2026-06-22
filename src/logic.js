// logic.js — 価格計算ロジック
//
// 純粋関数（同じ入力に対して必ず同じ結果を返す）。
// ネットワーク通信やファイル読み込みは行わない。

// 実質価格を計算する（商品価格 + 送料）
// 例: 商品3,980円 + 送料550円 → 実質4,530円
export function calcActualPrice(price, shipping) {
  return price + shipping;
}
