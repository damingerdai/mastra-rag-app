import "dotenv/config";

import { ingestDocument } from "../mastra/services/document.service.js";
import { client } from "../db/db.js";


async function main() {
  const url =
    "https://raw.githubusercontent.com/damingerdai/damingerdai.github.io/refs/heads/master/source/_posts/back-end/golang-argon2id-password-hashing.md";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch document: ${response.status}`,
    );
  }

  const originalContent = await response.text();

  const content = originalContent + `

## Version 2 Test

This document version introduces an updated
Argon2id implementation for lifecycle testing.
`;

  const result = await ingestDocument({
    source: url,
    title: "Go Argon2id Password Hashing",
    content,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });