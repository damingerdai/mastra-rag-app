
import { Agent } from "@mastra/core/agent";
import { knowledgeSearchTool } from "../tools/knowledge-search.tool.js";
import { workflowModel } from "../lib/openai.js";


export const researchAgent = new Agent({
  id: "research-agent",
  name: "Research Agent",
  instructions: `
    You are a technical research specialist.

    Responsibilities:
    1. Search the knowledge base for relevant information.
    2. Extract factual findings.
    3. Record source references.
    4. Identify missing evidence.

    Rules:
    - Always search before answering.
    - Never invent sources.
    - Clearly distinguish facts and assumptions.
    - If evidence is insufficient, say so.
    - Do not write the final article.

    Respond in Chinese.
  `,
  model: workflowModel,
  tools: {
    knowledgeSearchTool,
  },
});
