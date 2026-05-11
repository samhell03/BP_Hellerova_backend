require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const tripRoutes = require("./routes/tripRoutes");
const countryRoutes = require("./routes/countryRoutes");
const packageRoutes = require("./routes/packageRoutes");
const noteRoutes = require("./routes/noteRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

// CONFIG 
const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/travelApp";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";

// MIDDLEWARE 
app.use(
    cors({
        origin: [FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    next();
});

// DB 
mongoose
    .connect(MONGO_URL)
    .then(() => console.log("Úspěšně připojeno k MongoDB"))
    .catch((err) => console.error("Chyba připojení k DB:", err));

// ROUTES 
app.get("/", (req, res) => {
    res.send("Backend pro TravelApp běží.");
});

app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/notifications", notificationRoutes);

// START 
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server nastartován na http://127.0.0.1:${PORT}`);
});