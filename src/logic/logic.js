// logic.js — 価格比較ロジック（あなたの担当ファイル①）
//
// 純粋関数 = 同じ入力を渡せば必ず同じ結果が返る関数。
// ネットワーク通信やファイル読み込みはしない。

/**
 * 実質価格を計算する
 * 例: 商品3,980円 + 送料550円 → 実質4,530円
 */
export function calcActualPrice(price, shipping) {
  return price + shipping;
}

/**
 * 全サイトの中で実質価格が最安のサイトを返す
 * @param {Object} sites - snapshot.json の "sites" オブジェクト
 */
export function findCheapest(sites) {
  let cheapestName = null;
  let cheapestPrice = Infinity; // 最初は「無限大」にしておいて、比較のたびに更新する

  for (const [siteName, siteData] of Object.entries(sites)) {
    const actual = calcActualPrice(siteData.price, siteData.shipping);
    if (actual < cheapestPrice) {
      cheapestPrice = actual;
      cheapestName = siteName;
    }
  }

  return { name: cheapestName, actualPrice: cheapestPrice };
}

/**
 * 全サイトの実質価格一覧を安い順に並べて返す
 */
export function listActualPrices(sites) {
  const results = Object.entries(sites).map(([siteName, siteData]) => ({
    site: siteName,
    price: siteData.price,
    shipping: siteData.shipping,
    actualPrice: calcActualPrice(siteData.price, siteData.shipping),
  }));

  results.sort((a, b) => a.actualPrice - b.actualPrice);
  return results;
}
