// fetcher.js — 各ECサイトのAPI取得関数
//
// 【対応サイト】
//   Amazon           : 検索結果HTMLをスクレイピング（公式APIなし）
//   楽天市場          : ichibams API（キーワード検索）
//   Yahoo!ショッピング: ShoppingWebService V3 API
//     fetchYahooSearch → 価格比較ページ用（詳細情報あり）
//     fetchYahooItems  → ゲーム用（価格帯フィルタ・軽量）

const AMAZON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
};

// ── Amazon（スクレイピング） ─────────────────────────────────────
// AmazonはAPIを公開していないため、検索結果HTMLを解析して商品情報を取得する
export async function fetchAmazonSearch(keyword, count = 10) {
  const url = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`;
  const res = await fetch(url, { headers: AMAZON_HEADERS });
  if (!res.ok) throw new Error(`Amazon HTTP ${res.status}`);
  const html = await res.text();

  // ボット検知された場合はエラーにする（CAPTCHAページが返ってくる）
  if (html.includes("api-services-support@amazon.com") || html.includes("Type the characters you see")) {
    throw new Error("Amazon がボット検知しました");
  }

  const items = [];
  // 検索結果の各商品ブロックを分割して解析する
  const sections = html.split('data-component-type="s-search-result"').slice(1);

  for (const section of sections) {
    if (items.length >= count) break;
    try {
      const priceMatch = section.match(/a-price-whole[^>]*>([0-9,]+)/);
      if (!priceMatch) continue;
      const price = parseInt(priceMatch[1].replace(/,/g, ""), 10);
      if (price <= 0) continue;

      // h2のaria-labelに商品名が入っている
      const nameMatch = section.match(/h2[^>]*aria-label="([^"]+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1].trim().slice(0, 80);
      if (!name) continue;

      // ASINを抽出してクリーンなURLを生成
      const asinMatch = section.match(/\/dp\/([A-Z0-9]{10})/);
      const itemUrl = asinMatch ? `https://www.amazon.co.jp/dp/${asinMatch[1]}` : null;

      const imgMatch = section.match(/s-image"[^>]*src="([^"]+)"/);
      const image = imgMatch ? imgMatch[1] : null;

      const ratingMatch = section.match(/([\d.]+)\s*つ星/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

      const reviewMatch = section.match(/\(([0-9,]+)\)/);
      const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, ""), 10) : 0;

      items.push({
        name,
        price,
        shipping: 0,
        image,
        url: itemUrl,
        shop: "Amazon",
        rating,
        reviewCount,
        isOfficial: false,
        hasReturnPolicy: true,
        isOnSale: false,
        originalPrice: null,
        source: "Amazon",
      });
    } catch (_) {}
  }

  return items;
}

const YAHOO_API = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";

// ── 楽天市場（キーワード検索） ────────────────────────────────────
// 【API切り替え方法】
//   ichibams API（現在）: IP制限あり。RAKUTEN_APP_ID + RAKUTEN_ACCESS_KEY が必要
//   通常 Web Service API : IP制限なし。webservice.rakuten.co.jp で無料取得した
//                          数字のapplicationIdを RAKUTEN_APP_ID に設定するだけで動く
// ※ 末尾が数字で終わるキーワードはAPIに拒否されるため事前に除去する
//   例: "Soundcore Liberty 5" → "Soundcore Liberty"
export async function fetchRakutenSearch(keyword, count = 10) {
  const appId     = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!appId || !accessKey) throw new Error("楽天APIキーが未設定");

  // 末尾が数字で終わると楽天APIが拒否するため除去する
  // 例: "Liberty 5" → "Liberty" / "iphone13" → "iphone"
  // ただし "iPhone 13 mini" のように数字が末尾でない場合はそのまま
  const rakutenKeyword = keyword.replace(/\s*\d+$/, "").trim() || keyword;

  const params = new URLSearchParams({
    applicationId: appId,
    accessKey,
    keyword:       rakutenKeyword,
    hits:          String(Math.min(count, 30)),
  });
  const url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401?${params}`;

  const res = await fetch(url, { headers: { accessKey } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`楽天API HTTP ${res.status}: ${body.slice(0, 100)}`);
  }

  const data = await res.json();
  return (data.Items || []).map(({ Item }) => {
    const imgUrls = Item.mediumImageUrls || Item.smallImageUrls || [];
    let image = imgUrls[0] || null;
    if (image && typeof image === "object") image = image.imageUrl || null;

    return {
      name:        (Item.itemName || "").slice(0, 60),
      price:       Item.itemPrice,
      shipping:    Item.postageFlag === 0 ? 0 : 500,
      image,
      url:         Item.itemUrl || null,
      shop:        (Item.shopName || "楽天市場").slice(0, 30),
      rating:      parseFloat(Item.reviewAverage || 0),
      reviewCount: parseInt(Item.reviewCount || 0),
      isOfficial:  /公式|直営/.test(Item.shopName || ""),
      hasReturnPolicy: null, // ショップにより異なるため不明
      isOnSale:      false,
      originalPrice: null,
      points:        0,
      source:        "Rakuten",
    };
  });
}

// ── Yahoo!ショッピング（価格比較ページ用） ───────────────────────
// セール情報・ポイント・レビュー・公式判定など詳細情報を返す
export async function fetchYahooSearch(keyword, count = 10) {
  const clientId = process.env.YAHOO_CLIENT_ID;
  if (!clientId) throw new Error("YAHOO_CLIENT_ID が .env に設定されていません");

  const params = new URLSearchParams({
    query: keyword,
    results: String(Math.min(count, 50)),
    sort: "-score",
  });

  const res = await fetch(`${YAHOO_API}?${params}&appid=${clientId}`, {
    headers: { "Referer": "https://github.com/kom322/-G5" },
  });
  if (!res.ok) throw new Error(`Yahoo API エラー: HTTP ${res.status}`);

  const data = await res.json();
  return (data.hits || [])
    .filter(hit => hit.price > 0)
    .map(hit => {
      const cleanName = (hit.name || "不明")
        .replace(/[　\s]\/.*$/, "").replace(/\/.*$/, "").trim().slice(0, 60);
      const review = hit.review || {};
      const pl = hit.priceLabel || {};
      const pt = hit.point || {};
      const isOnSale = pl.discountedPrice != null && pl.discountedPrice < pl.defaultPrice;
      const points = (pt.amount ?? 0) + (pt.bonusAmount ?? 0) + (pt.lyLimitedBonusAmount ?? 0);

      return {
        name:          cleanName,
        price:         hit.price,
        shipping:      hit.shipping?.code === 1 ? 0 : 500,
        image:         hit.image?.medium || null,
        url:           hit.url || null,
        shop:          (hit.seller?.name || "Yahoo!ショッピング").slice(0, 30),
        rating:        parseFloat(review.rate || 0),
        reviewCount:   parseInt(review.count || 0),
        isOfficial:    /公式|直営/.test(hit.seller?.name || ""),
        hasReturnPolicy: null, // ショップにより異なるため不明
        isOnSale,
        originalPrice: isOnSale ? (pl.defaultPrice ?? null) : null,
        points,
      };
    });
}

// ── Yahoo!ショッピング（ゲーム用・価格帯フィルタ付き） ───────────
// ゲームで「どっちが高い？」の商品を選ぶために使う（毎回ランダムなソートで多様性を確保）
export async function fetchYahooItems(keyword, minPrice = 0, maxPrice = 999999) {
  const clientId = process.env.YAHOO_CLIENT_ID;
  if (!clientId) throw new Error("YAHOO_CLIENT_ID が .env に設定されていません");

  // ランダムなソート順で毎回違う商品を取得する（startは使わずsortで多様性を出す）
  const SORTS = ["-sold", "-review", "-score", "standard", "-price", "+price"];
  const sort = SORTS[Math.floor(Math.random() * SORTS.length)];

  const params = new URLSearchParams({
    query: keyword,
    results: "50",
    sort,
    price_from: String(minPrice),
    price_to: String(maxPrice),
  });

  const res = await fetch(`${YAHOO_API}?${params}&appid=${clientId}`, {
    headers: { "Referer": "https://github.com/kom322/-G5" },
  });
  if (!res.ok) throw new Error(`Yahoo API エラー: HTTP ${res.status}`);

  const data = await res.json();
  return (data.hits || [])
    .filter(hit => hit.price > 0)
    .map(hit => {
      // Yahoo商品名に混入するカテゴリパス（「　/家電/...」）を除去する
      const cleanName = (hit.name || "不明")
        .replace(/[　\s]\/.*$/, "") // 　/カテゴリ/... を削除
        .replace(/\/.*$/, "")           // /カテゴリ/... を削除
        .trim()
        .slice(0, 30);
      return {
        name: cleanName || "不明",
        price: hit.price,
        image: hit.image?.medium || null,
        shop: hit.seller?.name || "Yahoo!ショッピング",
      };
    });
}
