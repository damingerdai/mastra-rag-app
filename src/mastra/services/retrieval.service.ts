import { embed } from "ai";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "../../db/db.js";
import {
  documents,
  documentVersions,
  documentChunks,
} from "../../db/schema.js";
import { embeddingModel } from "../lib/embedding.js";
import { INDEX_NAME, vectorStore } from "../lib/verctor-store.js";


interface SearchOptions {
  topK?: number;
  candidateLimit?: number;
  minScore?: number;
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  documentId: string;
  versionId: string;
  source: string;
  chunkIndex: number;
}

export async function searchKnowledge(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const {
    topK = 5,
    candidateLimit = 50,
    minScore = 0,
  } = options;

  if (!query.trim()) {
    throw new Error("Search query cannot be empty");
  }

  if (
    !Number.isInteger(topK) ||
    !Number.isInteger(candidateLimit) ||
    topK < 1 ||
    candidateLimit < topK
  ) {
    throw new Error("Invalid search limits");
  }

  // 1. 生成 Query Embedding
  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
  });

  if (embedding.length !== 1024) {
    throw new Error("Invalid query embedding dimensions");
  }

  // 2. 从 PgVector 检索候选向量
  const candidates = await vectorStore.query({
    indexName: INDEX_NAME,
    queryVector: embedding,
    topK: candidateLimit,
  });

  if (candidates.length === 0) {
    return [];
  }

  // 3. 提取 Vector ID
  const candidateIds = candidates.map((item) => item.id);

  // 4. 使用 Drizzle 批量查询有效 Chunk
  const validChunks = await db
    .select({
      vectorId: documentChunks.vectorId,
      documentId: documents.id,
      versionId: documentVersions.id,
    })
    .from(documentChunks)
    .innerJoin(
      documentVersions,
      eq(
        documentChunks.documentVersionId,
        documentVersions.id,
      ),
    )
    .innerJoin(
      documents,
      and(
        eq(
          documentVersions.documentId,
          documents.id,
        ),
        eq(
          documents.currentVersionId,
          documentVersions.id,
        ),
      ),
    )
    .where(
      and(
        inArray(documentChunks.vectorId, candidateIds),
        eq(documents.status, "active"),
        isNull(documents.deletedAt),
        eq(documentVersions.status, "active"),
      ),
    );

  // 5. 构建有效 Vector ID 映射
  const validMap = new Map(
    validChunks.map((chunk) => [
      chunk.vectorId,
      chunk,
    ]),
  );

  // 6. 过滤旧版本并保持相似度排序
  const results: SearchResult[] = [];

  for (const candidate of candidates) {
    const valid = validMap.get(candidate.id);

    if (!valid) continue;

    const score = candidate.score ?? 0;

    if (score < minScore) continue;

    const metadata = candidate.metadata ?? {};

    if (
      typeof metadata.text !== "string" ||
      typeof metadata.source !== "string" ||
      typeof metadata.chunkIndex !== "number"
    ) {
      continue;
    }

    results.push({
      id: candidate.id,
      text: metadata.text,
      score,
      documentId: valid.documentId,
      versionId: valid.versionId,
      source: metadata.source,
      chunkIndex: metadata.chunkIndex,
    });

    if (results.length >= topK) {
      break;
    }
  }

  return results;
}