import { embed } from "ai";

import { embeddingModel } from "../lib/embedding.js";
import { vectorStore, INDEX_NAME } from "../lib/verctor-store.js";

export async function retrieve(query: string, topK = 5) {
  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
  });

  const results = await vectorStore.query({
    indexName: INDEX_NAME,
    queryVector: embedding,
    topK,
  });

  return results.map((result) => ({
    id: result.id,
    score: result.score,
    text: String(result.metadata?.text ?? ""),
    source: String(result.metadata?.source ?? ""),
  }));
}