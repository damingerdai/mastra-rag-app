import { PgVector } from "@mastra/pg";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { embeddingModel } from "./embedding.js";
import { makeVectorId } from "./id-gen.js";
import { saveDocumentChunks } from "../../db/repositories/document-chunk.repository.js";

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

interface IndexInput {
  documentId: string;
  versionId: string;
  source: string;
  content: string;
}

export async function indexDocumentVersion(input: IndexInput) {
  const { documentId, versionId, source, content } = input;
  const doc = MDocument.fromMarkdown(content);
  const chunks = await doc.chunk({
    strategy: 'recursive',
    maxSize: 512,
    overlap: 50,
  });
  const texts = chunks.map((chunk) => chunk.text);
  if (texts.length === 0) {
    throw new Error("Document has no indexable content");
  }
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });

  if (
    embeddings.length !== texts.length ||
    embeddings.some((v) => v.length !== 1024)
  ) {
    throw new Error("Invalid embedding dimensions");
  }

  const ids = texts.map((_, index) =>
    makeVectorId(input.versionId, index),
  );

  await vectorStore.upsert({
    indexName: INDEX_NAME,
    ids,
    vectors: embeddings,
    metadata: texts.map((text, index) => ({
      docId: input.documentId,
      versionId: input.versionId,
      chunkIndex: index,
      text,
      source: input.source,
    })),
  });

   await saveDocumentChunks({
    versionId,
    texts,
    vectorIds: ids,
  });

  return {
    chunkCount: texts.length,
    vectorIds: ids,
  };
}