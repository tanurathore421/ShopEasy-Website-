
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
   {
    name: "Cosmetics",
    image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=435&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  },
    {
    name: "Home Decor",
    image: "https://images.unsplash.com/photo-1610237676534-6fe67e5424d4?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  },
  
   {
    name: "Bags & handbags",
    image: "https://images.unsplash.com/photo-1637999434344-883be956cb4a?q=80&w=464&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  },
    {
    name: "Crockery",
    image: "https://images.unsplash.com/photo-1594135549290-f3a299aee716?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  },
    {
    name: "Eyewear",
    image: "https://images.unsplash.com/photo-1608539733292-190446b22b83?q=80&w=652&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  },
   {
    name: "toys & games",
    image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
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

