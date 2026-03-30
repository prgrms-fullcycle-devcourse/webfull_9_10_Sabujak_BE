import fs from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";
import { generateOpenApiDocument } from "../src/openapi/registry";

const outputPath = path.resolve(process.cwd(), "openapi.json");

const main = async () => {
  const serialized = `${JSON.stringify(generateOpenApiDocument(), null, 2)}\n`;
  const expected = await prettier.format(serialized, { parser: "json" });
  const actual = await fs.readFile(outputPath, "utf-8").catch(() => "");

  if (actual !== expected) {
    console.error(
      "openapi.json is out of date. Run `pnpm openapi:generate` and commit the updated file.",
    );
    process.exit(1);
  }

  console.log("openapi.json is up to date.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
