
const Product = require("../MODELS/product.model");

// ==========================================
// ADD PRODUCT
// ==========================================
const addProduct = async (req, res) => {
  try {
    const { image, name, price, category } = req.body;

    if (
      typeof image !== "string" ||
      !image.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Image, name, price and category are required",
      });
    }

    const productPrice = Number(price);

    if (!Number.isFinite(productPrice) || productPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid product price",
      });
    }

    const product = await Product.create({
      image: image.trim(),
      name: name.trim(),
      price: productPrice,
      category: category.trim(),
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("Add product error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Error adding product",
    });
  }
};

// ==========================================
// GET ACTIVE PRODUCTS FOR CUSTOMERS
// ==========================================
const getProducts = async (req, res) => {
  try {
    // Include old products that do not yet have isActive.
    const products = await Product.find({
      isActive: { $ne: false },
    }).sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (error) {
    console.error("Get products error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

module.exports = {
  addProduct,
  getProducts,
};


/* const Product=require("../MODELS/product.model");

const addProduct=async(req,res)=>{
    try{
        const {image,name,price,category}=req.body;
        const product=new Product({
            image,
            name,
            price,
            category
        })
        await product.save();
        res.status(201).json({message:"Product added successfully",
            product:product});
    }
    catch(error){
        res.status(500).json({message:"Error adding product", error});
    }
}

const getProducts=async(req,res)=>{
    try{
        const products=await Product.find();
        res.status(200).json(products);
    }
    catch(error){
        res.status(500).json({message:"Error fetching products", error});
    }
}

module.exports={addProduct,getProducts}; */