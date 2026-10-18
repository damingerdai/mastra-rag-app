import "dotenv/config";

import { vectorStore, INDEX_NAME } from "../mastra/lib/verctor-store.js";

async function main() {
  await vectorStore.createIndex({
    indexName: INDEX_NAME,
    dimension: 1024,
  });

  console.log(`Vector index "${INDEX_NAME}" initialized`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});