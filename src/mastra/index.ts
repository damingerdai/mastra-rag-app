import { Mastra } from "@mastra/core";
import { knowledgeAgent } from "./agents/knowledge.agent.js";

export const mastra = new Mastra({
    agents: { knowledgeAgent }
})