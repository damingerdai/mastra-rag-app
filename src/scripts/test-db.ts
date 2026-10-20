import "dotenv/config";

import { db, client } from "../db/db.js";
import {
  documents,
  documentVersions,
  documentChunks,
} from "../db/schema.js";

async function main() {
  const [docs, versions, chunks] = await Promise.all([
    db.select().from(documents).limit(5),
    db.select().from(documentVersions).limit(5),
    db.select().from(documentChunks).limit(5),
  ]);

  console.log({
    documents: docs.length,
    versions: versions.length,
    chunks: chunks.length,
  });
}

main()
  .catch(console.error)
  .finally(() => client.end());