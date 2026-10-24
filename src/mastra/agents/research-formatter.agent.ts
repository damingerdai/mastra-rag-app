
import { Agent } from "@mastra/core/agent";
import { workflowModel } from "../lib/openai.js";

export const researchFormatterAgent = new Agent({
  id: "research-formatter",
  name: "Research Formatter",
  model: workflowModel,
  instructions: `
    You convert research reports into structured JSON.

    Rules:
    - Preserve the meaning of the original report.
    - Never add new facts.
    - Never invent sources.
    - Use English JSON property names.
    - Use Chinese for content values.
    - Follow the supplied schema exactly.
    - Return only a valid JSON object.
  `,
});
