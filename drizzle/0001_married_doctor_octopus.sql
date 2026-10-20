ALTER TABLE "document_versions" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "id" SET DEFAULT uuidv7();