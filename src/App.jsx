import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// 💡 1. 리얼리티 반영: 달러 대신 일본 엔(JPY) 기준으로 PS5 가격을 세팅했습니다 (약 7만 엔 대)
const mockProductHistory = [
  { date: '2026-05-28', Amazon: 74900, Rakuten: 73500, Yahoo: 75000 },
  { date: '2026-05-29', Amazon: 74500, Rakuten: 73500, Yahoo: 74800 },
  { date: '2026-05-30', Amazon: 74000, Rakuten: 73000, Yahoo: 74500 },
  { date: '2026-05-31', Amazon: 73800, Rakuten: 72500, Yahoo: 74000 },
  { date: '2026-06-01', Amazon: 73500, Rakuten: 72000, Yahoo: 73800 },
];

function App() {
  const [inputText, setInputText] = useState(''); 
  const [productName, setProductName] = useState('PlayStation 5');

  const handleSearch = () => {
    if (inputText.trim() !== '') {
      setProductName(inputText);   
      setInputText('');            
    }
  };

  // 💡 2. 엔터키 감지 함수 추가: 사용자가 키보드를 누를 때마다 이 함수가 실행됩니다.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { // 누른 키가 'Enter'라면
      handleSearch();        // 검색 버튼을 누른 것과 똑같이 handleSearch를 실행!
    }
  };

  return (
    <div style={{ backgroundColor: 'white', color: 'black', padding: '40px', width: '800px', margin: '50px auto', border: '2px solid #ccc', borderRadius: '12px' }}>
      
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>📈 {productName} ECサイト価格比較</h1>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)} 
          onKeyDown={handleKeyDown} // 💡 3. 입력창에 엔터키 감지 센서를 달아줍니다!
          placeholder="商品を検索 (例: RTX 4090)" 
          style={{ padding: '10px', width: '300px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px 0 0 4px' }}
        />
        <button 
          onClick={handleSearch} 
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer' }}
        >
          検索
        </button>
      </div>
      
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
        {/* 💡 4. 엔화는 글자 길이가 길어서 왼쪽 축 숫자가 잘릴 수 있으므로 margin(여백) 속성에서 left를 30으로 살짝 넓혀줬습니다 */}
        <LineChart width={750} height={400} data={mockProductHistory} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="black" />
          {/* 💡 5. 단위가 커졌으므로, Y축이 20씩 변하는 대신 1000엔 단위로 여유를 갖게 했습니다 */}
          <YAxis domain={['dataMin - 1000', 'auto']} stroke="black" />
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

export default App;