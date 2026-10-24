import "dotenv/config";

import { searchKnowledge } from "../mastra/services/retrieval.service.js";

const query =
  process.argv.slice(2).join(" ") ||
  "为什么 Argon2id 比 MD5 更适合密码存储？";

const results = await searchKnowledge(query, { topK: 3 });

for (const [index, result] of results.entries()) {
  console.log(`\n--- Result ${index + 1} ---`);
  console.log("Score:", result.score);
  console.log("Source:", result.source);
  console.log("Text:", result.text);
}
