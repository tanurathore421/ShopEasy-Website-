
import { useNavigate } from "react-router-dom";
import "./categories.css";

const categories = [
  {
    name: "Electronics",
    image: "https://media.istockphoto.com/id/1211554164/photo/3d-render-of-home-appliances-collection-set.jpg?s=1024x1024&w=is&k=20&c=lo0Tcu8myT3LQhtsMCiq_rk_ukICERxaoomtcufaK7U=",
  },
  {
    name: "Clothes",
    image: "https://plus.unsplash.com/premium_photo-1779699716480-064976c88eb2?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  },
  {
    name: "Footwear",
    image: "https://plus.unsplash.com/premium_photo-1670984222499-b566bf5cef69?q=80&w=688&auto=format&fit=crop",
  },
];

const Categories = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryName) => {
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <section className="categories">
      <h2>Shop by Category</h2>

      <div className="category-container">
        {categories.map((category) => (
          <div className="category-card" key={category.name}>
            <img src={category.image} alt={category.name} />

            <div className="category-overlay">
              <h3>{category.name}</h3>
              <button
                onClick={() => handleCategoryClick(category.name)}
              >
                Shop Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Categories;

