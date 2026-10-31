const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from backend .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");

    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

module.exports = connectDB;

/* const mongoose=require("mongoose");

const connectDB=async()=>{
   try{
       await mongoose.connect(process.env.MONGO_URI);
       console.log("mongodb connected");
   }
   catch(error){
    console.log("connection failed",error.message);
   }

}

module.exports=connectDB; */