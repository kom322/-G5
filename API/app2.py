import sqlite3
import json
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import urllib.parse
import time
import os
from dotenv import load_dotenv

# .envファイルから環境変数を読み込む
load_dotenv()

# ==========================================
# ⚙️ 各種設定（APIキーなど）
# ==========================================
DB_NAME = "price_history.db"

# 楽天の新しいOpenAPIは「Application ID」と「Access Key」の両方が必要
RAKUTEN_APP_ID = os.getenv("RAKUTEN_APP_ID")
RAKUTEN_ACCESS_KEY = os.getenv("RAKUTEN_ACCESS_KEY")
YAHOO_CLIENT_ID = os.getenv("YAHOO_CLIENT_ID")

# 共通ヘッダー（Botブロック対策）
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ja-JP,ja;q=0.9"
}

# ==========================================
# 1. データベース初期設定
# ==========================================
def setup_database():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            site TEXT NOT NULL,
            price REAL NOT NULL,
            review_average REAL,
            review_count INTEGER,
            item_name TEXT,
            item_url TEXT,
            image_url TEXT,
            shipping_fee INTEGER,
            UNIQUE(date, site)
        )
    ''')
    
    # 既存DB用カラム追加チェック（エラー防止用）
    cursor.execute("PRAGMA table_info(prices)")
    columns = [column[1] for column in cursor.fetchall()]
    
    additional_columns = {
        "review_average": "REAL",
        "review_count": "INTEGER",
        "item_name": "TEXT",
        "item_url": "TEXT",
        "image_url": "TEXT",
        "shipping_fee": "INTEGER"
    }
    
    for col_name, col_type in additional_columns.items():
        if col_name not in columns:
            cursor.execute(f"ALTER TABLE prices ADD COLUMN {col_name} {col_type}")
        
    conn.commit()
    conn.close()

# ==========================================
# 2. 各ショッピングサイトからのデータ取得ロジック
# ==========================================

def fetch_amazon_price(keyword):
    """Amazonからスクレイピングで情報を取得"""
    print("  [Amazon] 検索中...")
    url = f"https://www.amazon.co.jp/s?k={urllib.parse.quote(keyword)}"
    try:
        time.sleep(1)
        res = requests.get(url, headers=HEADERS, timeout=10)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")
        
        results = soup.select('div[data-component-type="s-search-result"]')
        for result in results:
            price_elem = result.select_one('span.a-price-whole')
            title_elem = result.select_one('h2 a span')
            link_elem = result.select_one('h2 a')
            img_elem = result.select_one('img.s-image')
            
            if price_elem and title_elem and link_elem:
                price_str = price_elem.text.replace(',', '')
                item_url = "https://www.amazon.co.jp" + link_elem.get('href', '')
                image_url = img_elem.get('src', '') if img_elem else None
                
                return {
                    "price": float(price_str),
                    "review_average": None,
                    "review_count": None,
                    "item_name": title_elem.text.strip(),
                    "item_url": item_url,
                    "image_url": image_url,
                    "shipping_fee": None
                }
        return None
    except Exception as e:
        print(f"  ❌ Amazon取得失敗: {e}")
        return None

def fetch_rakuten_price(keyword):
    """【新API・2キー完全分離版】楽天APIから情報を取得"""
    if not RAKUTEN_APP_ID or not RAKUTEN_ACCESS_KEY:
        print("  [楽天] ⚠️ APIキーまたはアクセスキーが未設定のためスキップします")
        return None
        
    print("  [楽天] 検索中...")
    url = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/v1"
    
    # ヘッダーには Access Key を設定
    rakuten_headers = HEADERS.copy()
    rakuten_headers["accessKey"] = RAKUTEN_ACCESS_KEY
    
    # クエリパラメータにそれぞれのキーを正しく割り振る
    params = {
        "applicationId": RAKUTEN_APP_ID,  # こっちは Application ID
        "accessKey": RAKUTEN_ACCESS_KEY,  # こっちは Access Key
        "keyword": keyword,
        "hits": 1
    }
    
    try:
        res = requests.get(url, headers=rakuten_headers, params=params, timeout=10)
        
        if res.status_code != 200:
            print(f"  ❌ 楽天APIエラー詳細 (Status {res.status_code}): {res.text}")
            res.raise_for_status()
            
        data = res.json()
        items = data.get("Items", [])
        
        if items:
            first_item = items[0]
            item_data = first_item.get("Item", first_item)
            
            # 各種データの安全な抽出
            img_urls = item_data.get("mediumImageUrls", item_data.get("smallImageUrls", []))
            image_url = img_urls[0] if isinstance(img_urls, list) and img_urls else None
            if isinstance(image_url, dict):
                image_url = image_url.get("imageUrl")

            postage_flag = item_data.get("postageFlag")
            shipping_fee = 0 if postage_flag == 0 else None

            return {
                "price": float(item_data["itemPrice"]),
                "review_average": float(item_data.get("reviewAverage", 0.0)),
                "review_count": int(item_data.get("reviewCount", 0)),
                "item_name": item_data.get("itemName"),
                "item_url": item_data.get("itemUrl"),
                "image_url": image_url,
                "shipping_fee": shipping_fee
            }
        return None
    except Exception as e:
        print(f"  ❌ 楽天取得失敗: {e}")
        return None
    
def fetch_yahoo_price(keyword):
    """Yahoo!ショッピングAPIから情報を取得"""
    if not YAHOO_CLIENT_ID:
        print("  [Yahoo] ⚠️ Client ID未設定のためスキップします")
        return None
        
    print("  [Yahoo] 検索中...")
    url = "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch"
    headers = {"User-Agent": f"Yahoo AppID: {YAHOO_CLIENT_ID}"}
    params = {"query": keyword, "results": 1, "sort": "+price"}
    try:
        res = requests.get(url, headers=headers, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()
        hits = data.get("hits", [])
        if hits:
            hit = hits[0]
            review_data = hit.get("review", {})
            img_data = hit.get("image", {})
            shipping_data = hit.get("shipping", {})
            
            shipping_fee = 0 if shipping_data.get("code") == 1 else None

            return {
                "price": float(hit.get("price", 0)),
                "review_average": float(review_data.get("rate", 0.0)),
                "review_count": int(review_data.get("count", 0)),
                "item_name": hit.get("name"),
                "item_url": hit.get("url"),
                "image_url": img_data.get("medium"),
                "shipping_fee": shipping_fee
            }
        return None
    except Exception as e:
        print(f"  ❌ Yahoo取得失敗: {e}")
        return None

# ==========================================
# 3. データの統合・保存・JSON変換
# ==========================================
def save_to_db(date_str, data_dict):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    for site, info in data_dict.items():
        if info is not None:
            cursor.execute('''
                INSERT OR REPLACE INTO prices (
                    date, site, price, review_average, review_count, item_name, item_url, image_url, shipping_fee
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                date_str, site, info["price"], info["review_average"], info["review_count"],
                info["item_name"], info["item_url"], info["image_url"], info["shipping_fee"]
            ))
    conn.commit()
    conn.close()

def get_graph_json():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT date, site, price, review_average, review_count, item_name, item_url, image_url, shipping_fee 
        FROM prices ORDER BY date ASC
    ''')
    rows = cursor.fetchall()
    conn.close()

    grouped_data = {}
    for row in rows:
        date_str, site, price, review_avg, review_cnt, name, url, img, shipping = row
        if date_str not in grouped_data:
            grouped_data[date_str] = {"date": date_str}
            
        grouped_data[date_str][site] = {
            "price": price,
            "review_average": review_avg,
            "review_count": review_cnt,
            "item_name": name,
            "item_url": url,
            "image_url": img,
            "shipping_fee": shipping
        }

    return json.dumps(list(grouped_data.values()), indent=2, ensure_ascii=False)

# ==========================================
# 🚀 メイン実行処理
# ==========================================
if __name__ == "__main__":
    setup_database()
    
    print("=== ECサイト総合情報 ＆ DB蓄積システム ===")
    keyword = input("検索したい商品名を入力してください: ")
    
    today_str = datetime.now().strftime('%Y-%m-%d')
    print(f"\n【{today_str}】データ取得を開始します...")
    
    current_data = {
        "Amazon": fetch_amazon_price(keyword),
        "Rakuten": fetch_rakuten_price(keyword),
        "Yahoo": fetch_yahoo_price(keyword)
    }
    
    save_to_db(today_str, current_data)
    print("👉 すべての取得データをデータベース(SQLite)に格納しました。")
    
    print("\n📊 フロントエンド側（Next.js等）に渡す最終JSON形式:")
    print(get_graph_json())