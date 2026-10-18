import { PgVector } from "@mastra/pg";

export const vectorStore = new PgVector({
  id: "knowledge-vectors",
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});

export const INDEX_NAME = "knowledge_base";

export async function initializeVectorStore() {
  await vectorStore.createIndex({
    indexName: INDEX_NAME,
    dimension: 1024,
  });
}