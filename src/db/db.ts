import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

const connectionString = process.env.POSTGRES_CONNECTION_STRING;

if (!connectionString) {
  throw new Error(
    "POSTGRES_CONNECTION_STRING is not defined",
  );
}

export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
});

export const db = drizzle({
  client,
  schema,
});