import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import feedRouter from "./routes/feed";
import boardsRouter from "./routes/boards";
import profilesRouter from "./routes/profiles";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/health", healthRouter);
app.use("/feed", feedRouter);
app.use("/boards", boardsRouter);
app.use("/profiles", profilesRouter);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
