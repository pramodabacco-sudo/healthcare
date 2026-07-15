import dotenv from "dotenv";
dotenv.config();

import app from "./src/index.js";
console.log("DATABASE_URL:", process.env.DATABASE_URL);
const PORT = process.env.PORT || 4000;


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});