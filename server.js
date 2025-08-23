import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import courseRoutes from "./src/routes/course.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api/course", courseRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on :=> http://localhost:${PORT}`);
});
