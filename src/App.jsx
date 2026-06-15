import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

import mockDb from '../data/snapshot.json';
import { findCheapest, calcActualPrice } from './logic/logic';
import { calcSafetyScore } from './logic/safetyScore';

function Home() {
  const [inputText, setInputText] = useState('');

  // 💡 방어 코드 1: JSON이 옛날 방식(객체)이든 새 방식(배열)이든 에러가 나지 않게 강제로 배열로 맞춰줍니다!
  const safeDb = Array.isArray(mockDb) ? mockDb : [mockDb];
  const [currentProduct, setCurrentProduct] = useState(safeDb[0]);

  const handleSearch = () => {
    if (inputText.trim() !== '') {
      const foundProduct = safeDb.find(p => p.product && p.product.toLowerCase().includes(inputText.toLowerCase()));

      if (foundProduct) {
        setCurrentProduct(foundProduct);
      } else {
        alert("該当する商品がありません。（※テスト用データ: PlayStation, Panasonic）");
      }
      setInputText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // 💡 방어 코드 2: 만약 currentProduct가 어떻게든 비어있다면, 흰 화면 대신 친절한 에러 메시지를 띄웁니다!
  if (!currentProduct || !currentProduct.snapshots) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', color: 'red' }}>
        <h2>⚠️ データの読み込みエラー</h2>
        <p>snapshot.json ファイルのデータ形式が正しくありません。</p>
      </div>
    );
  }

  const chartData = currentProduct.snapshots.map(snapshot => ({
    date: snapshot.date,
    Amazon: snapshot.sites.Amazon ? calcActualPrice(snapshot.sites.Amazon.price, snapshot.sites.Amazon.shipping) : 0,
    Rakuten: snapshot.sites.Rakuten ? calcActualPrice(snapshot.sites.Rakuten.price, snapshot.sites.Rakuten.shipping) : 0,
    Yahoo: snapshot.sites.Yahoo ? calcActualPrice(snapshot.sites.Yahoo.price, snapshot.sites.Yahoo.shipping) : 0,
  }));

  const latestSnapshot = currentProduct.snapshots[currentProduct.snapshots.length - 1];
  const cheapestInfo = findCheapest(latestSnapshot.sites);
  const cheapestSiteData = latestSnapshot.sites[cheapestInfo.name];
  const safetyScore = cheapestSiteData ? calcSafetyScore(cheapestSiteData) : 0;

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>📈 {currentProduct.product} 価格比較</h1>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="商品を検索 (例: PlayStation)"
          style={{ padding: '10px', width: '300px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px 0 0 4px' }}
        />
        <button onClick={handleSearch} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer' }}>検索</button>
      </div>

      <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '12px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>🔥 今日の最安値 (送料込): </span>
          <span style={{ fontSize: '20px', color: '#bf0000', fontWeight: 'bold', marginLeft: '10px' }}>
            {cheapestInfo.name} ({cheapestInfo.actualPrice.toLocaleString()}円)
          </span>
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          🛡️ ショップ安全性:
          <span style={{ fontWeight: 'bold', color: safetyScore >= 80 ? '#28a745' : safetyScore >= 60 ? '#ffc107' : '#dc3545', marginLeft: '5px' }}>
            {safetyScore}点
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <LineChart width={750} height={400} data={chartData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="black" />
          <YAxis domain={['auto', 'auto']} stroke="black" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="Amazon" name="Amazon" stroke="#ff9900" strokeWidth={3} />
          <Line type="monotone" dataKey="Rakuten" name="楽天" stroke="#bf0000" strokeWidth={3} />
          <Line type="monotone" dataKey="Yahoo" name="Yahoo!" stroke="#ff0033" strokeWidth={3} />
        </LineChart>
      </div>
    </div>
  );
}

function FavoritesPlaceholder() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h2>⭐ お気に入り（前回価格との比較）</h2>
      <p style={{ color: '#666', marginTop: '20px', fontSize: '18px' }}>現在、友達が絶賛開発中です！<br />後ほどここに機能が組み込まれます。</p>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <div style={{ backgroundColor: 'white', color: 'black', padding: '40px', width: '800px', margin: '50px auto', border: '2px solid #ccc', borderRadius: '12px' }}>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <button
          onClick={() => setCurrentPage('home')}
          style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: currentPage === 'home' ? '#f0f0f0' : 'transparent', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: currentPage === 'home' ? 'bold' : 'normal' }}
        >
          🏠 ホーム（価格比較）
        </button>
        <button
          onClick={() => setCurrentPage('favorites')}
          style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: currentPage === 'favorites' ? '#f0f0f0' : 'transparent', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: currentPage === 'favorites' ? 'bold' : 'normal' }}
        >
          ⭐ お気に入り
        </button>
      </div>

      {currentPage === 'home' ? <Home /> : <FavoritesPlaceholder />}

    </div>
  );
}