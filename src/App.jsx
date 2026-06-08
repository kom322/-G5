import React, { useState } from 'react'; // 💡 useState를 새로 가져옵니다!
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const mockProductHistory = [
  { date: '2026-05-28', Amazon: 499.99, Rakuten: 450.00, Yahoo: 480.00 },
  { date: '2026-05-29', Amazon: 499.99, Rakuten: 460.00, Yahoo: 475.00 },
  { date: '2026-05-30', Amazon: 479.99, Rakuten: 455.00, Yahoo: 470.00 },
  { date: '2026-05-31', Amazon: 479.99, Rakuten: 440.00, Yahoo: 450.00 },
  { date: '2026-06-01', Amazon: 459.99, Rakuten: 435.00, Yahoo: 445.00 },
];

function App() {
  // 리액트의 기억 장치(State) 2개를 만듭니다.
  // 1. 현재 검색창에 사용자가 타이핑하고 있는 임시 글자
  const [inputText, setInputText] = useState(''); 
  // 2. 검색 버튼을 눌렀을 때 최종적으로 확정되어 제목에 뜰 상품명 (기본값: PlayStation 5)
  const [productName, setProductName] = useState('PlayStation 5');

  // 검색(検索)ボタンを押したときの処理 (버튼 클릭 시 실행될 함수)
  const handleSearch = () => {
    if (inputText.trim() !== '') { // 빈칸이 아닐 때만 작동
      setProductName(inputText);   // 임시 글자를 최종 상품명으로 확정!
      setInputText('');            // 검색창은 다시 빈칸으로 청소
    }
  };

  return (
    <div style={{ backgroundColor: 'white', color: 'black', padding: '40px', width: '800px', margin: '50px auto', border: '2px solid #ccc', borderRadius: '12px' }}>
      
      {/* 💡 고정되어 있던 'PlayStation 5' 대신, 기억 장치에 있는 {productName}을 띄웁니다! */}
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>📈 {productName} ECサイト価格比較</h1>

      {/* 💡 검색창 UI 시작 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)} // 글자를 칠 때마다 임시 글자를 업데이트
          placeholder="商品を検索" 
          style={{ padding: '10px', width: '300px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px 0 0 4px' }}
        />
        <button 
          onClick={handleSearch} 
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer' }}
        >
          検索
        </button>
      </div>
      {/* 검색창 UI 끝 */}
      
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
        <LineChart width={750} height={400} data={mockProductHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="black" />
          <YAxis domain={['dataMin - 20', 'auto']} stroke="black" />
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