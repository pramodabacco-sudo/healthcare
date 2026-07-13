// /server\src\index.js
import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes.js";

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get("/", (req, res) => {
  res.json({
    message: "Server is Live",
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

export default app;