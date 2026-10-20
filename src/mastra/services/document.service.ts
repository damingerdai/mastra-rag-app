import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "../../db/db.js";
import {
  documentVersions,
  documents,
} from "../../db/schema.js";

import {
    createDocumentVersion,
  getOrCreateDocument,
  publishDocumentVersion,
} from "../../db/repositories/document.repository.js";
import { indexDocumentVersion } from "../lib/verctor-store.js";

 

const PIPELINE_VERSION = "recursive-512-50-v1";
const EMBEDDING_MODEL = "BAAI/bge-m3";

interface IngestDocumentInput {
  source: string;
  title?: string;
  content: string;
}

function sha256(content: string) {
  return createHash("sha256")
    .update(content, "utf8")
    .digest("hex");
}

export async function ingestDocument(
  input: IngestDocumentInput,
) {
  const { source, title, content } = input;
  const contentHash = sha256(content);

  // 1. 获取或创建逻辑文档
  const document = await getOrCreateDocument(
    source,
    title,
  );

  // 2. 查询当前已发布版本
  const [currentVersion] = document.currentVersionId
    ? await db
        .select()
        .from(documentVersions)
        .where(
          and(
            eq(
              documentVersions.id,
              document.currentVersionId,
            ),
            eq(documentVersions.documentId, document.id),
          ),
        )
        .limit(1)
    : [];

  // 3. 检查是否需要重新索引
  if (
    currentVersion?.contentHash === contentHash &&
    currentVersion.pipelineVersion === PIPELINE_VERSION &&
    currentVersion.embeddingModel === EMBEDDING_MODEL &&
    currentVersion.status === "active"
  ) {
    return {
      status: "unchanged" as const,
      documentId: document.id,
      versionId: currentVersion.id,
    };
  }

  // 4. 创建新版本
  const version = await createDocumentVersion({
    documentId: document.id,
    contentHash,
    pipelineVersion: PIPELINE_VERSION,
    embeddingModel: EMBEDDING_MODEL,
  });

  try {
    // 5. 更新为 processing
    await db
      .update(documentVersions)
      .set({ status: "processing" })
      .where(eq(documentVersions.id, version.id));

    // 6. 调用你已经写好的 Mastra 索引服务
    const result = await indexDocumentVersion({
      documentId: document.id,
      versionId: version.id,
      source,
      content,
    });

    // 7. 发布新版本
    await publishDocumentVersion(
      document.id,
      version.id,
      result.chunkCount,
    );

    return {
      status: "indexed" as const,
      documentId: document.id,
      versionId: version.id,
      versionNumber: version.versionNumber,
      chunkCount: result.chunkCount,
    };
  } catch (error) {
    // 8. 记录失败状态
    await db
      .update(documentVersions)
      .set({
        status: "failed",
        errorMessage:
          error instanceof Error
            ? error.message
            : String(error),
      })
      .where(eq(documentVersions.id, version.id));

    throw error;
  }
}