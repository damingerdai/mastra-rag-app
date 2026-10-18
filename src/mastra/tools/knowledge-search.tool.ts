import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { retrieve } from "../services/retrieval.service.js";

export const knowledgeSearchTool = createTool({
  id: "knowledge-search",
  description:
    "Search the knowledge base for relevant information. " +
    "Use this tool to answer questions about stored documents.",

  inputSchema: z.object({
    query: z.string().describe("Search query"),
  }),

  outputSchema: z.object({
    results: z.array(
      z.object({
        source: z.string(),
        text: z.string(),
        score: z.number(),
      }),
    ),
  }),

  execute: async ({ query }) => {
    const results = await retrieve(query, 5);

    return {
      results: results.map(({ source, text, score }) => ({
        source,
        text,
        score,
      })),
    };
  },
});