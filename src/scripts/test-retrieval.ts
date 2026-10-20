import "dotenv/config";

import { client } from "../db/db.js";
import {
  searchKnowledge,
} from "../mastra/services/retrieval.service.js";

async function main() {
  const query = "Go 语言中如何使用 Argon2id 进行密码哈希？";

  const results = await searchKnowledge(query, {
    topK: 5,
    candidateLimit: 50,
  });

  console.log(`Query: ${query}`);
  console.log(`Found ${results.length} results`);

  for (const [index, result] of results.entries()) {
    console.log(`\n--- Result ${index + 1} ---`);
    console.log("Score:", result.score);
    console.log("Document:", result.documentId);
    console.log("Version:", result.versionId);
    console.log("Source:", result.source);
    console.log("Text:", result.text.slice(0, 300));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });