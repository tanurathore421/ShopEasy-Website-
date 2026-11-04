require("dotenv").config({
  path: __dirname + "/.env",
});

const express = require("express");
const cors = require("cors");
const session = require("express-session");

const connectDB = require("./DB/db");

const authRoutes = require("./ROUTES/authRoutes");
const captchaRoutes = require("./ROUTES/captchaRoutes");
const productRoutes = require("./ROUTES/productRoutes");
const orderRoutes = require("./ROUTES/orderRoutes");
const paymentRoutes = require("./ROUTES/paymentRoutes");
const helpChatRoutes = require("./ROUTES/helpChatRoutes");
const adminRoutes = require("./ROUTES/admin.routes");
const wholesalerRoutes = require("./ROUTES/wholesalerRoutes");

const {
  startPaymentReservationCleanup,
} = require("./SERVICES/paymentReservationCleanup");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:3001",
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/captcha", captchaRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/help-chat", helpChatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/wholesaler", wholesalerRoutes);

// Start server only after MongoDB connects successfully.
connectDB()
  .then(() => {
    startPaymentReservationCleanup();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  });


/* require("dotenv").config({
    path: __dirname + "/.env"
});

const express=require("express");
const connectDB = require("./DB/db");
const dotenv = require("dotenv");
const authRoutes=require("./ROUTES/authRoutes");
const captchaRoutes=require("./ROUTES/captchaRoutes");
const productRoutes=require("./ROUTES/productRoutes");
const orderRoutes=require("./ROUTES/orderRoutes");
const paymentRoutes=require("./ROUTES/paymentRoutes");
const helpChatRoutes = require("./ROUTES/helpChatRoutes");
const adminRoutes = require("./ROUTES/admin.routes");
const cors=require("cors");
const session = require("express-session");


dotenv.config();

const app=express();
app.use(cors(
   {
        origin: "http://localhost:3001",
        credentials: true
    }
));
app.use(session(
   {
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
            httpOnly: true,
            secure: false, // Set to true if using HTTPS
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        } 
   }
));

connectDB();

app.use(express.json());
app.use("/api/auth",authRoutes);
app.use("/api/captcha",captchaRoutes);
app.use("/api/products",productRoutes);
app.use("/api/orders",orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/help-chat", helpChatRoutes);
app.use("/api/admin", adminRoutes);

const PORT=process.env.PORT||5000;

app.listen(PORT,()=>{
   console.log( `server runnning on ${PORT}`);
}); */