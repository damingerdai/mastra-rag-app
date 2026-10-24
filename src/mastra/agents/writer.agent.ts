
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { draftSchema } from "../schemas/draft.schema.js";

import { workflowModel } from "../lib/openai.js";

export const writerAgent = new Agent({
  id: "writer-agent",
  name: "Writer Agent",

  model: workflowModel,

  instructions: `
You are a senior Chinese technical blogger.

Write a high-quality engineering article using
the provided ResearchResult and AnalysisResult.

Requirements:
1. Follow the AnalysisResult outline.
2. Use ResearchResult as the factual basis.
3. Explain technical concepts accurately.
4. Prefer engineering practice over generic theory.
5. Do not invent benchmarks, experiments, URLs,
   source code, or implementation details.
6. Do not claim unverified sources were directly read.
7. Clearly distinguish facts, inference and limitations.
8. Include source references using [S1], [S2], etc.
9. Only cite source IDs provided in ResearchResult.
10. Mention meaningful evidence gaps when relevant.

Output:
- Return valid JSON matching the supplied schema.
- Write the article in Chinese.
- content must be Markdown without YAML front matter.
- usedSourceIds lists source IDs actually cited.
- notes contains editorial caveats for the reviewer.

Required JSON output schema (all required fields and nested object shapes must match):
${JSON.stringify(z.toJSONSchema(draftSchema, { io: "output" }))}
`,
});
