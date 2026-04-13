import { writeDbSchemaReference } from "./db-schema-reference";

const main = async () => {
  const outputPath = await writeDbSchemaReference();
  console.log(`Updated ${outputPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
