import cors from "cors";
import express from "express";
import routes from "./routes";

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.use(express.json());
app.use(
  cors({
    origin: allowedOrigins,
  }),
);
app.use("/", routes);

export default app;
