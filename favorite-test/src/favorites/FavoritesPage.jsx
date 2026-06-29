import { useState } from "react";
import favoritesData from "./mockFavorites";
import FavoriteCard from "./FavoriteCard";

function FavoritesPage() {
    const [favorites, setFavorites] = useState(favoritesData);

    const handleDelete = (id) => {
        setFavorites(prev =>
        prev.filter(item => item.id !== id)
        );
    };

    return (
    <div>
        <h1>⭐ お気に入り一覧</h1>

        {favorites.map(item => (
        <FavoriteCard
            key={item.id}
            item={item}
            onDelete={handleDelete}
        />
        ))}
    </div>
    );
}

export default FavoritesPage;