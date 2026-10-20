import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  sourceUri: text("source_uri").notNull().unique(),
  title: text("title"),
  status: text("status").notNull().default("pending"),
  currentVersionId: uuid("current_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    documentId: uuid("document_id").notNull().references(() => documents.id),
    versionNumber: integer("version_number").notNull(),
    contentHash: text("content_hash").notNull(),
    pipelineVersion: text("pipeline_version").notNull(),
    embeddingModel: text("embedding_model").notNull(),
    status: text("status").notNull().default("pending"),
    chunkCount: integer("chunk_count").default(0),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.documentId, table.versionNumber)],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: text("id").primaryKey(),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersions.id),
    chunkIndex: integer("chunk_index").notNull(),
    contentHash: text("content_hash").notNull(),
    vectorId: text("vector_id").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique().on(table.documentVersionId, table.chunkIndex)],
);
