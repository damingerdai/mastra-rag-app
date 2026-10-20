CREATE TABLE "document_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"document_version_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content_hash" text NOT NULL,
	"vector_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "document_chunks_vector_id_unique" UNIQUE("vector_id"),
	CONSTRAINT "document_chunks_document_version_id_chunk_index_unique" UNIQUE("document_version_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"content_hash" text NOT NULL,
	"pipeline_version" text NOT NULL,
	"embedding_model" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"chunk_count" integer DEFAULT 0,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"published_at" timestamp with time zone,
	CONSTRAINT "document_versions_document_id_version_number_unique" UNIQUE("document_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_uri" text NOT NULL,
	"title" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	CONSTRAINT "documents_source_uri_unique" UNIQUE("source_uri")
);
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;