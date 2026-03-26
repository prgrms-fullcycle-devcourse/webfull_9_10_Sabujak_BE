import fs from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";
import { generateOpenApiDocument } from "../src/openapi/registry";

const outputPath = path.resolve(process.cwd(), "openapi.json");

const main = async () => {
  const document = generateOpenApiDocument();
  const serialized = await prettier.format(JSON.stringify(document), {
    parser: "json",
  });

  await fs.writeFile(outputPath, serialized, "utf-8");
  console.log(`OpenAPI document generated at ${outputPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
