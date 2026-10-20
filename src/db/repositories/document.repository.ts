import { eq, and, desc } from "drizzle-orm";
import { db } from "../db.js";
import { documents, documentVersions } from "../schema.js";

export async function findDocumentBySource(
  sourceUri: string,
) {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.sourceUri, sourceUri))
    .limit(1);

  return document ?? null;
}

export async function getOrCreateDocument(
  sourceUri: string,
  title?: string,
) {
  await db
    .insert(documents)
    .values({
      sourceUri,
      title,
    })
    .onConflictDoNothing({
      target: documents.sourceUri,
    });

  const document = await findDocumentBySource(sourceUri);

  if (!document) {
    throw new Error("Failed to get or create document");
  }

  if (document.deletedAt) {
    throw new Error("Document has been deleted");
  }

  return document;
}

export async function getCurrentVersion(
  documentId: string,
  currentVersionId: string | null,
) {
  if (!currentVersionId) return null;

  const [version] = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.id, currentVersionId),
        eq(documentVersions.documentId, documentId),
      ),
    )
    .limit(1);

  return version ?? null;
}

interface CreateVersionInput {
  documentId: string;
  contentHash: string;
  pipelineVersion: string;
  embeddingModel: string;
}

export async function createDocumentVersion(
  input: CreateVersionInput,
) {
  return db.transaction(async (tx) => {
    // 锁住文档，串行化版本号分配
    const [document] = await tx
      .select()
      .from(documents)
      .where(eq(documents.id, input.documentId))
      .for("update");

    if (!document || document.deletedAt) {
      throw new Error("Document not available");
    }

    const [latest] = await tx
      .select({
        versionNumber: documentVersions.versionNumber,
      })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, input.documentId))
      .orderBy(desc(documentVersions.versionNumber))
      .limit(1);

    const [version] = await tx
      .insert(documentVersions)
      .values({
        documentId: input.documentId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        contentHash: input.contentHash,
        pipelineVersion: input.pipelineVersion,
        embeddingModel: input.embeddingModel,
        status: "pending",
      })
      .returning();

    if (!version) {
      throw new Error("Failed to create document version");
    }

    return version;
  });
}

export async function publishDocumentVersion(
  documentId: string,
  versionId: string,
  chunkCount: number,
) {
  return db.transaction(async (tx) => {
    const [document] = await tx
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .for("update");

    if (!document || document.deletedAt) {
      throw new Error("Document unavailable for publishing");
    }

    const [version] = await tx
      .select()
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.id, versionId),
          eq(documentVersions.documentId, documentId),
        ),
      );

    if (!version || version.status !== "processing") {
      throw new Error("Document version is not processing");
    }

    // 防止旧任务覆盖已经发布的较新版本
    if (document.currentVersionId) {
      const [current] = await tx
        .select()
        .from(documentVersions)
        .where(
          eq(documentVersions.id, document.currentVersionId),
        );

      if (
        current &&
        current.versionNumber >= version.versionNumber
      ) {
        throw new Error("A newer version is already published");
      }
    }

    await tx
      .update(documentVersions)
      .set({
        status: "active",
        chunkCount,
        publishedAt: new Date(),
      })
      .where(eq(documentVersions.id, versionId));

    await tx
      .update(documents)
      .set({
        currentVersionId: versionId,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return version;
  });
}