import "dotenv/config";
import { ingest } from "../mastra/services/knowledge.service.js";

async function main() {
  const url =  'https://raw.githubusercontent.com/damingerdai/damingerdai.github.io/refs/heads/master/source/_posts/back-end/golang-argon2id-password-hashing.md';
  const response = await fetch(url);
  const text = await response.text();
  console.log("Text length:", text.length);
  console.log("Text preview:", text.slice(0, 200));
  const result = await ingest(text, url);
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});