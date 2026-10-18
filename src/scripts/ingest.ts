import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ingest } from "../mastra/services/knowledge.service.js";

async function loadDocument(input: string): Promise<string> {
  if (input.startsWith("https://") || input.startsWith("http://")) {
    const response = await fetch(input);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch document: ${response.status} ${response.statusText}`,
      );
    }

    return response.text();
  }

  return readFile(resolve(input), "utf-8");
}

async function main() {
  const [input, source] = process.argv.slice(2);

  if (!input) {
    console.error(
      "Usage: npm run ingest -- <file-or-url> [source-url]",
    );
    process.exitCode = 1;
    return;
  }

  const documentSource = source ?? input;

  console.log(`Loading document: ${input}`);

  const text = await loadDocument(input);

  if (!text.trim()) {
    throw new Error("Document is empty");
  }

  console.log(`Text length: ${text.length}`);
  console.log(`Source: ${documentSource}`);

  const result = await ingest(text, documentSource);

  console.log("Ingestion completed:", result);
}

main().catch((error) => {
  console.error("Ingestion failed:", error);
  process.exitCode = 1;
});
