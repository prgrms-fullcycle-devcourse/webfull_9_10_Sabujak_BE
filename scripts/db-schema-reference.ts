import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const dbSchemaReferenceHeader = `-- Reference-only schema snapshot
-- Source of truth: src/db/schema.ts + drizzle migrations
-- Do not apply this file directly. Use Drizzle migration commands instead.

`;

export const docsSchemaPath = path.resolve(process.cwd(), "docs/schema.sql");

export const createDbSchemaReferenceContent = async () => {
  const { stdout } = await execFileAsync(
    "pnpm",
    ["exec", "drizzle-kit", "export", "--config", "drizzle.config.ts", "--sql"],
    {
      cwd: process.cwd(),
    },
  );

  return `${dbSchemaReferenceHeader}${stdout.trim()}\n`;
};

export const writeDbSchemaReference = async () => {
  const content = await createDbSchemaReferenceContent();
  await fs.writeFile(docsSchemaPath, content, "utf-8");
  return docsSchemaPath;
};
