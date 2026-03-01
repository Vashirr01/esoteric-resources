import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import tasksRouter from "./routes/tasks";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/health", healthRouter);
app.use("/tasks", tasksRouter);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
