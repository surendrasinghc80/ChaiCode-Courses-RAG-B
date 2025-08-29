import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import courseRoutes from "./src/routes/course.routes.js";
import conversationRoutes from "./src/routes/conversation.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import { sequelize, testConnection } from "./src/config/database.js";
import "./src/models/index.js"; // Initialize model associations

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/course", courseRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/admin", adminRoutes);

// Initialize database connection and sync models
const initializeDatabase = async () => {
  try {
    await testConnection();
    // Use basic sync without alter to avoid too many keys error
    await sequelize.sync({ force: false });
    console.log("✅ Database synchronized successfully.");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server is running on :=> http://localhost:${PORT}`);
  await initializeDatabase();
});
