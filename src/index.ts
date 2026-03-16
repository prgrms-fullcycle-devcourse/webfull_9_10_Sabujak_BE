import express from "express";
import appRouter from "./app/app.route";

const app = express();

app.use("/", appRouter);

const PORT = process.env.API_PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
