import fs from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";
import { generateOpenApiDocument } from "../src/openapi/registry";

const outputPath = path.resolve(process.cwd(), "openapi.json");

const main = async () => {
  const document = generateOpenApiDocument();
  const serialized = `${JSON.stringify(document, null, 2)}\n`;
  const formatted = await prettier.format(serialized, { parser: "json" });

  await fs.writeFile(outputPath, formatted, "utf-8");
  console.log(`OpenAPI document generated at ${outputPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
