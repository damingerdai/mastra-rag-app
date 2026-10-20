import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.POSTGRES_CONNECTION_STRING;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(connectionString ? { dbCredentials: { url: connectionString } } : {}),
});
