import { Mastra } from "@mastra/core";
import { knowledgeAgent } from "./agents/knowledge.agent.js";
import { pgStore } from "./lib/pg-store.js";

export const mastra = new Mastra({
    agents: { knowledgeAgent },
    storage: pgStore,
})