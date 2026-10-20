import { db } from "../db.js";
import { documentChunks } from "../schema.js";
import { sha256 } from "../../lib/hash.js";
import type { InferInsertModel } from "drizzle-orm";

interface SaveChunksInput {
    versionId: string;
    texts: string[];
    vectorIds: string[];
}

type NewDocumentChunk =
    InferInsertModel<typeof documentChunks>;

export async function saveDocumentChunks(
    input: SaveChunksInput,
) {
    const { versionId, texts, vectorIds } = input;

    if (texts.length !== vectorIds.length) {
        throw new Error("Chunk and vector count mismatch");
    }

    if (texts.length === 0) {
        return;
    }

    const values: NewDocumentChunk[] = texts.map(
        (text, index) => ({
            id: vectorIds[index]!,
            documentVersionId: versionId,
            chunkIndex: index,
            contentHash: sha256(text),
            vectorId: vectorIds[index]!,
        }),
    );

    await db
        .insert(documentChunks)
        .values(values)
        .onConflictDoNothing({
            target: documentChunks.id,
        });
}