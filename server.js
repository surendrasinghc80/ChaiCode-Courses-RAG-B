import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import courseRoutes from "./src/routes/course.routes.js";
import chatRoutes from "./src/routes/chat.routes.js";
import { sequelize, testConnection } from "./src/config/database.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/course", courseRoutes);
app.use("/api/chat", chatRoutes);

// Initialize database connection and sync models
const initializeDatabase = async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true }); // Use { force: true } to recreate tables
    console.log('✅ Database synchronized successfully.');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server is running on :=> http://localhost:${PORT}`);
  await initializeDatabase();
});
