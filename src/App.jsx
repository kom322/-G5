import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const mockProductHistory = [
  { date: '2026-05-28', Amazon: 499.99, Rakuten: 450.00, Yahoo: 480.00 },
  { date: '2026-05-29', Amazon: 499.99, Rakuten: 460.00, Yahoo: 475.00 },
  { date: '2026-05-30', Amazon: 479.99, Rakuten: 455.00, Yahoo: 470.00 },
  { date: '2026-05-31', Amazon: 479.99, Rakuten: 440.00, Yahoo: 450.00 },
  { date: '2026-06-01', Amazon: 459.99, Rakuten: 435.00, Yahoo: 445.00 },
];

function App() {
  return (
    <div style={{ backgroundColor: 'white', color: 'black', padding: '40px', width: '800px', margin: '50px auto', border: '2px solid #ccc', borderRadius: '12px' }}>
      
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>📈 PlayStation 5 価格</h1>
      

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
        <LineChart width={750} height={400} data={mockProductHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="black" />
          <YAxis domain={['dataMin - 20', 'auto']} stroke="black" />
          <Tooltip />
          <Legend />
          
          <Line type="monotone" dataKey="Amazon" name="Amazon" stroke="#0046be" strokeWidth={3} />
          <Line type="monotone" dataKey="Rakuten" name="Rakuten" stroke="#e53238" strokeWidth={3} />
          <Line type="monotone" dataKey="Yahoo" name="Yahoo" stroke="#ff9900" strokeWidth={3} />
          
        </LineChart>
      </div>

    </div>
  );
}

export default App;