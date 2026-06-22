// server.js — 安心価格ナビ メインサーバー
//
// 役割:
//   - フロントエンド（index.html）からの検索リクエストを受け取る
//   - Yahoo!ショッピング・楽天市場・Amazon を並列で検索して結果を返す
//   - お気に入り商品の保存・価格履歴の管理を行う
//   - ゲーム（どっちが高い？）用の商品ペアを返す
//
// 起動: node server.js  /  停止: Ctrl+C

import http from "http";
import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { calcActualPrice }                              from "./src/logic.js";
import { calcSafetyScore, getSafetyLabel, getWarnings } from "./src/safetyScoreRefactored.js";
import { fetchYahooItems, fetchYahooSearch, fetchRakutenSearch, fetchAmazonSearch } from "./src/fetcher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// ── ネガティブキーワードフィルター設定 ────────────────────────────
// 【元に戻す方法】NEGATIVE_FILTER_ENABLED を false にする
//
// 有効時の動作:
//   - クエリ自体にアクセサリ語が入っていない場合（例: "iPhone 13 mini"）
//     → 商品名にアクセサリ語が含まれる商品を除外する
//   - クエリにアクセサリ語が入っている場合（例: "iPhone 13 mini ケース"）
//     → フィルタしない（ケースを探していると判断）
const NEGATIVE_FILTER_ENABLED = true;
const ACCESSORY_WORDS = ["ケース", "カバー", "フィルム", "ガラスフィルム", "保護フィルム", "スクリーン保護", "スマホカバー"];

// ── お気に入り ────────────────────────────────────────────────────
// favorites.json        : お気に入り登録した商品の一覧（配列）
// favorites_history.json: 商品IDごとの日別価格履歴（オブジェクト）
const FAVORITES_PATH = path.join(__dirname, "data", "favorites.json");
const FAVORITES_HISTORY_PATH = path.join(__dirname, "data", "favorites_history.json");

function loadFavorites() {
  try { return fs.existsSync(FAVORITES_PATH) ? JSON.parse(fs.readFileSync(FAVORITES_PATH, "utf-8")) : []; }
  catch { return []; }
}
function saveFavorites(list) {
  fs.writeFileSync(FAVORITES_PATH, JSON.stringify(list, null, 2), "utf-8");
}
function loadFavoritesHistory() {
  try { return fs.existsSync(FAVORITES_HISTORY_PATH) ? JSON.parse(fs.readFileSync(FAVORITES_HISTORY_PATH, "utf-8")) : {}; }
  catch { return {}; }
}
function saveFavoritesHistory(hist) {
  fs.writeFileSync(FAVORITES_HISTORY_PATH, JSON.stringify(hist, null, 2), "utf-8");
}

// お気に入り商品の最新価格を各APIから取得して履歴に追記する
// → 起動時に1回 + 毎日0時に自動実行
async function refreshFavoritePrices() {
  const favs = loadFavorites();
  if (favs.length === 0) return;
  const hist  = loadFavoritesHistory();
  const today = new Date().toISOString().split("T")[0];
  console.log(`🔄 お気に入り価格更新 (${favs.length}件)...`);
  for (const fav of favs) {
    try {
      // 商品が登録されたショップ(source)に合わせてAPIを切り替える
      const items   = fav.source === "Rakuten"
        ? await fetchRakutenSearch(fav.keyword, 10)
        : await fetchYahooSearch(fav.keyword, 10);
      const matched = items.find(i => i.url === fav.url) ?? items[0];
      if (!matched) continue;
      if (!hist[fav.id]) hist[fav.id] = [];
      const idx = hist[fav.id].findIndex(h => h.date === today);
      if (idx >= 0) hist[fav.id][idx].price = matched.price; // 当日分を上書き
      else          hist[fav.id].push({ date: today, price: matched.price });
      console.log(`  ✅ ${fav.name.slice(0, 20)} → ${matched.price}円`);
    } catch (e) {
      console.log(`  ⚠ ${fav.name.slice(0, 20)}: ${e.message}`);
    }
  }
  saveFavoritesHistory(hist);
}

// ── ゲーム用データ ────────────────────────────────────────────────
// 「どっちが高い？」ゲームで使うカテゴリ別キーワード一覧
const GENRE_KEYWORDS = {
  "全て":         ["日用品", "人気商品", "おすすめ", "生活用品", "食品", "雑貨", "文具", "洗剤"],
  "家電":         ["イヤホン", "スマートフォン", "カメラ", "テレビ", "掃除機", "充電器", "スピーカー", "ドライヤー", "電子レンジ"],
  "ファッション": ["スニーカー", "バッグ", "Tシャツ", "ジャケット", "時計", "帽子", "財布", "サンダル", "マフラー"],
  "キッチン":     ["鍋", "フライパン", "コーヒーメーカー", "包丁", "電気ケトル", "タッパー", "まな板", "水筒"],
  "おもちゃ":     ["ボードゲーム", "フィギュア", "ぬいぐるみ", "レゴ", "プラモデル", "カードゲーム", "パズル"],
  "スポーツ":     ["ランニングシューズ", "ヨガマット", "プロテイン", "テニスラケット", "水筒", "タオル", "サプリ"],
};

// ラウンドが進むほど価格差の範囲が狭まり、正解が難しくなる
const ROUND_DIFF_RANGE = [
  [0.40, 0.50], // ラウンド1: 40〜50%差（簡単）
  [0.30, 0.40], // ラウンド2
  [0.20, 0.30], // ラウンド3
  [0.10, 0.20], // ラウンド4
  [0.01, 0.10], // ラウンド5: 1〜10%差（難しい）
];

// 商品リストから「価格差が指定範囲内のペア」を1組ランダムに選ぶ
function pickTwo(items, minDiff, maxDiff) {
  const valid = items.filter(x => x.price > 0);
  if (valid.length < 2) throw new Error("商品が足りません");

  // シャッフルして順番に試し、範囲内のペアを探す
  const shuffled = [...valid].sort(() => Math.random() - 0.5);
  for (let i = 0; i < shuffled.length; i++) {
    const a    = shuffled[i];
    const rest = shuffled.filter((_, idx) => idx !== i).sort(() => Math.random() - 0.5);
    for (const b of rest) {
      if (a.price === b.price) continue;
      const diff = Math.abs(a.price - b.price) / Math.max(a.price, b.price);
      if (diff >= minDiff && diff <= maxDiff) return [a, b].sort(() => Math.random() - 0.5);
    }
  }

  // 指定範囲内が見つからない場合は最も近いペアを返す
  const allPairs = [];
  for (let i = 0; i < shuffled.length - 1; i++) {
    for (let j = i + 1; j < shuffled.length; j++) {
      const a = shuffled[i], b = shuffled[j];
      if (a.price === b.price) continue;
      const diff = Math.abs(a.price - b.price) / Math.max(a.price, b.price);
      allPairs.push({ a, b, diff });
    }
  }
  if (allPairs.length === 0) throw new Error("有効なペアが見つかりません");

  allPairs.sort((x, y) => {
    const distX = x.diff < minDiff ? minDiff - x.diff : x.diff > maxDiff ? x.diff - maxDiff : 0;
    const distY = y.diff < minDiff ? minDiff - y.diff : y.diff > maxDiff ? y.diff - maxDiff : 0;
    return distX - distY;
  });
  return [allPairs[0].a, allPairs[0].b].sort(() => Math.random() - 0.5);
}

// ゲーム1ラウンド分の商品ペアを取得する
// → Yahoo APIを複数回試行（失敗したら範囲を緩和して再試行）
async function getGameItems(genre, minPrice, maxPrice, round) {
  const [minDiff, maxDiff] = ROUND_DIFF_RANGE[round - 1] ?? [0.01, 0.10];
  const keywords = GENRE_KEYWORDS[genre] || GENRE_KEYWORDS["全て"];

  // フェーズ1: 厳密な価格差範囲で3回試みる
  for (let i = 0; i < 3; i++) {
    const kw = keywords[Math.floor(Math.random() * keywords.length)];
    try {
      const items = await fetchYahooItems(kw, minPrice, maxPrice);
      if (items.length >= 2) return pickTwo(items, minDiff, maxDiff);
    } catch (e) { console.log(`⚠ 試行${i + 1}: ${e.message}`); }
  }

  // フェーズ2: 価格差範囲を緩和して再試行
  const relaxMin = minDiff * 0.5;
  const relaxMax = Math.min(maxDiff * 1.5, 0.75);
  console.log(`⚠ 範囲緩和: ${Math.round(relaxMin * 100)}〜${Math.round(relaxMax * 100)}%`);
  for (let i = 0; i < 2; i++) {
    const kw = keywords[Math.floor(Math.random() * keywords.length)];
    try {
      const items = await fetchYahooItems(kw, minPrice, maxPrice);
      if (items.length >= 2) return pickTwo(items, relaxMin, relaxMax);
    } catch (e) { console.log(`⚠ 緩和試行${i + 1}: ${e.message}`); }
  }

  // フェーズ3: キーワードを「全て」カテゴリに広げて最終試行
  const fallbackKws = GENRE_KEYWORDS["全て"];
  for (let i = 0; i < 2; i++) {
    const kw = fallbackKws[Math.floor(Math.random() * fallbackKws.length)];
    try {
      const items = await fetchYahooItems(kw, minPrice, maxPrice);
      if (items.length >= 2) return pickTwo(items, relaxMin, relaxMax);
    } catch (e) { console.log(`⚠ 最終試行${i + 1}: ${e.message}`); }
  }

  throw new Error("商品を取得できませんでした");
}

// ── HTTPサーバー ──────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

  // ── 商品検索 GET /api/search?q=キーワード ──────────────────────
  // Yahoo・楽天・Amazon を並列取得 → 安全スコアを付けて安い順に返す
  if (reqUrl.pathname === "/api/search") {
    const q = (reqUrl.searchParams.get("q") || "").trim();
    if (!q) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "検索キーワードを入力してください" }));
      return;
    }
    try {
      // Promise.allSettled: どれかのAPIが失敗しても他の結果は返せる
      const [yahooResult, rakutenResult, amazonResult] = await Promise.allSettled([
        fetchYahooSearch(q, 20),
        fetchRakutenSearch(q, 10),
        fetchAmazonSearch(q, 1),
      ]);

      const yahooRaw    = yahooResult.status    === "fulfilled" ? yahooResult.value.map(i => ({ ...i, source: "Yahoo" }))   : [];
      const rakutenRaw  = rakutenResult.status  === "fulfilled" ? rakutenResult.value : [];
      const amazonRaw   = amazonResult.status   === "fulfilled" ? amazonResult.value  : [];
      const yahooError   = yahooResult.status   === "rejected"  ? yahooResult.reason?.message   : null;
      const rakutenError = rakutenResult.status === "rejected"  ? rakutenResult.reason?.message : null;
      const amazonError  = amazonResult.status  === "rejected"  ? amazonResult.reason?.message  : null;
      if (yahooError)  console.log(`⚠ Yahoo取得失敗: ${yahooError}`);
      if (amazonError) console.log(`⚠ Amazon取得失敗: ${amazonError}`);

      const raw = [...yahooRaw, ...rakutenRaw, ...amazonRaw];
      if (raw.length === 0) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ query: q, items: [], fetchedAt: new Date().toISOString(), rakutenError }));
        return;
      }

      // 検索ワードを空白で分割して、全ワードが商品名に含まれるものだけ残す
      // 例: "iphone 15" → "iphone"と"15"の両方が含まれる商品のみ
      const norm     = s => s.toLowerCase().replace(/[\s　]/g, "");
      const words    = q.split(/[\s　]+/).filter(w => w.length >= 2).map(norm);
      const filtered = words.length > 0
        ? raw.filter(item => words.every(w => norm(item.name).includes(w)))
        : raw;
      const source = filtered.length >= 2 ? filtered : raw; // フィルタ後が少なすぎたら元に戻す

      // 実質価格（商品価格 + 送料）と安全スコアを付与して、安い順に並べる
      let items = source
        .map(item => {
          const actualPrice = calcActualPrice(item.price, item.shipping);
          const score       = calcSafetyScore(item);
          return { ...item, actualPrice, score, label: getSafetyLabel(score), warnings: getWarnings(item) };
        })
        .sort((a, b) => a.actualPrice - b.actualPrice);

      // ネガティブキーワードフィルター
      // クエリにアクセサリ語が入っていない場合のみ、商品名からアクセサリを除外する
      // 例: "iPhone 13 mini" → ケース・フィルムを除外
      //     "iPhone 13 mini ケース" → フィルタしない（ケースを探している）
      if (NEGATIVE_FILTER_ENABLED) {
        const queryHasAccessory = ACCESSORY_WORDS.some(w => q.includes(w));
        if (!queryHasAccessory) {
          const negFiltered = items.filter(item => !ACCESSORY_WORDS.some(w => item.name.includes(w)));
          if (negFiltered.length >= 3) items = negFiltered; // 3件以上残る場合のみ適用
        }
      }

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({
        query: q, items,
        sources: { yahoo: yahooRaw.length, rakuten: rakutenRaw.length, amazon: amazonRaw.length },
        yahooError, rakutenError,
        fetchedAt: new Date().toISOString(),
      }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── お気に入り一覧 + 価格履歴取得 GET /api/favorites ───────────
  if (reqUrl.pathname === "/api/favorites" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ favs: loadFavorites(), hist: loadFavoritesHistory() }));
    return;
  }

  // ── お気に入り追加 POST /api/favorites ─────────────────────────
  if (reqUrl.pathname === "/api/favorites" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const item = JSON.parse(body);
        const favs = loadFavorites();
        // 同じURLがすでに登録済みなら追加しない
        if (favs.some(f => f.url === item.url)) {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, existed: true }));
          return;
        }
        // ユニークIDを生成（現在時刻 + 乱数の英数字）
        const id    = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        const today = new Date().toISOString().split("T")[0];
        favs.push({ id, ...item, addedAt: new Date().toISOString() });
        saveFavorites(favs);
        // 追加時点の価格を履歴の1件目として記録する
        const hist = loadFavoritesHistory();
        hist[id]   = [{ date: today, price: item.price }];
        saveFavoritesHistory(hist);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, id }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── お気に入り削除 DELETE /api/favorites/:id ───────────────────
  if (reqUrl.pathname.startsWith("/api/favorites/") && req.method === "DELETE") {
    const id   = reqUrl.pathname.replace("/api/favorites/", "");
    const favs = loadFavorites().filter(f => f.id !== id);
    saveFavorites(favs);
    const hist = loadFavoritesHistory();
    delete hist[id];
    saveFavoritesHistory(hist);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── ゲーム用 GET /api/game/round?genre=家電&min=0&max=999999&round=1
  if (reqUrl.pathname === "/api/game/round") {
    const genre    = reqUrl.searchParams.get("genre") || "全て";
    const minPrice = parseInt(reqUrl.searchParams.get("min") || "0");
    const maxPrice = parseInt(reqUrl.searchParams.get("max") || "999999");
    const round    = parseInt(reqUrl.searchParams.get("round") || "1");
    try {
      const items = await getGameItems(genre, minPrice, maxPrice, round);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(items));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── ゲームページ /game ──────────────────────────────────────────
  if (reqUrl.pathname === "/game") {
    const gamePath = path.join(__dirname, "public", "game.html");
    fs.readFile(gamePath, (err, data) => {
      if (err) { res.writeHead(500); res.end("Error"); return; }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  // ── メインページ（上記以外はすべて index.html を返す） ──────────
  const htmlPath = path.join(__dirname, "public", "index.html");
  fs.readFile(htmlPath, (err, data) => {
    if (err) { res.writeHead(500); res.end("Error"); return; }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  });
});

// ── サーバー起動 ──────────────────────────────────────────────────
server.listen(PORT, async () => {
  console.log(`\n🚀 サーバー起動中 → http://localhost:${PORT}`);
  console.log(`🎮 ゲーム        → http://localhost:${PORT}/game\n`);

  // 起動時に今日の価格を即取得
  refreshFavoritePrices();

  // 毎日0時ちょうどに価格更新を実行する
  const now             = new Date();
  const msUntilMidnight = +new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - +now;
  setTimeout(() => {
    refreshFavoritePrices();
    setInterval(refreshFavoritePrices, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  console.log(`   止めるときは Ctrl+C\n`);
});
