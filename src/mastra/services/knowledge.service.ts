import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";

import { embeddingModel } from "../lib/embedding.js";
import { INDEX_NAME, initializeVectorStore, vectorStore } from "../lib/verctor-store.js";

export async function ingest(
    text: string,
    source: string,
) {
    await initializeVectorStore()
    // 1. 创建文档
    const document = MDocument.fromText(text);

    // 2. 分块
    const chunks = await document.chunk({
        strategy: "recursive",
        maxSize: 512,
        overlap: 50,
    });

    if (chunks.length === 0) {
        return { count: 0 };
    }

    // 3. 生成 Embedding
    const { embeddings } = await embedMany({
        model: embeddingModel,
        values: chunks.map((chunk) => chunk.text),
    });

    // 4. 写入 PostgreSQL
    await vectorStore.upsert({
        indexName: INDEX_NAME,
        vectors: embeddings,
        metadata: chunks.map((chunk, index) => ({
            text: chunk.text,
            source,
            chunkIndex: index,
        })),
    });

    return { count: chunks.length };
}