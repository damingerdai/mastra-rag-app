import { PostgresStore } from "@mastra/pg";

export const pgStore = new PostgresStore({
  id: "knowledge-store",
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});