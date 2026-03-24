import "dotenv/config";
import app from "./app";
import { ensureDatabaseSchema } from "./db/ensure-schema";

const PORT = process.env.API_PORT || 3000;

const bootstrap = async () => {
  await ensureDatabaseSchema();

  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error("[startup] Failed to ensure database schema.", error);
  process.exit(1);
});
