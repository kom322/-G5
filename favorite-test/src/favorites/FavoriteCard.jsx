function FavoriteCard({ item, onDelete }) {
const diff = item.currentPrice - item.previousPrice;

const isDown = diff < 0;
const isUp = diff > 0;

return (
    <div
    style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    }}
    >
      {/* 左側 */}
    <div>
        <h3 style={{ margin: 0 }}>{item.name}</h3>
        <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
        現在価格: {item.currentPrice}円 / 以前: {item.previousPrice}円
        </p>
    </div>

      {/* 右側 */}
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
        style={{
            fontWeight: "bold",
            color: isDown ? "green" : isUp ? "red" : "#333",
        }}
        >
        {diff === 0
            ? "±0円"
            : isDown
            ? `${diff}円 ↓`
            : `+${diff}円 ↑`}
        </div>

        <button
        onClick={() => onDelete(item.id)}
        style={{
            background: "red",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "4px 8px",
            cursor: "pointer",
        }}
        >
        削除
        </button>
    </div>
    </div>
);
}

export default FavoriteCard;