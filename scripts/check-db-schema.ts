import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import {
  createDbSchemaReferenceContent,
  docsSchemaPath,
} from "./db-schema-reference";

const execFileAsync = promisify(execFile);
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const normalizeLineEndings = (value: string) => value.replace(/\r\n/g, "\n");

const assertNoForbiddenRuntimePaths = async () => {
  const [mainSource, dockerComposeSource] = await Promise.all([
    fs.readFile("src/main.ts", "utf-8"),
    fs.readFile("docker-compose.yml", "utf-8"),
  ]);

  if (mainSource.includes("ensureDatabaseSchema")) {
    throw new Error(
      "src/main.ts must not import or call ensureDatabaseSchema at runtime.",
    );
  }

  if (mainSource.includes("DATABASE_SCHEMA_AUTO_REPAIR")) {
    throw new Error(
      "src/main.ts must not gate application startup on DATABASE_SCHEMA_AUTO_REPAIR.",
    );
  }

  if (dockerComposeSource.includes("DATABASE_SCHEMA_AUTO_REPAIR")) {
    throw new Error(
      "docker-compose.yml must not enable DATABASE_SCHEMA_AUTO_REPAIR.",
    );
  }

  await fs.access("docs/migrations/001_add_idx.sql").then(
    () => {
      throw new Error(
        "docs/migrations/001_add_idx.sql is deprecated. Keep migration history in drizzle/ only.",
      );
    },
    () => undefined,
  );
};

const assertSchemaReferenceIsSynced = async () => {
  const [expected, actual] = await Promise.all([
    createDbSchemaReferenceContent(),
    fs.readFile(docsSchemaPath, "utf-8"),
  ]);

  if (normalizeLineEndings(actual) !== normalizeLineEndings(expected)) {
    throw new Error(
      "docs/schema.sql is out of date. Run `pnpm run db:schema:export` and commit the updated snapshot.",
    );
  }
};

const main = async () => {
  await execFileAsync(pnpmCommand, [
    "exec",
    "drizzle-kit",
    "check",
    "--config",
    "drizzle.config.ts",
  ]);

  await assertSchemaReferenceIsSynced();
  await assertNoForbiddenRuntimePaths();

  console.log("DB schema workflow is consistent with the Drizzle-only policy.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
