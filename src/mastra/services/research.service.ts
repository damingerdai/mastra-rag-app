import { z } from "zod";
import { researchAgent } from "../agents/research.agent.js";
import { researchFormatterAgent } from "../agents/research-formatter.agent.js";
import { researchSchema } from "../schemas/research.schema.js";

export async function conductResearch(prompt: string) {
  const report = await researchAgent.generate(prompt, { maxSteps: 8 });
  if (!report.text.trim()) {
    throw new Error(`Research returned an empty report (finishReason: ${report.finishReason})`);
  }

  const formatted = await researchFormatterAgent.generate(
    `Convert the research report into a complete JSON object.
All required fields must be present, including topic, findings, sources, gaps, summary.
Follow this JSON Schema exactly:
${JSON.stringify(z.toJSONSchema(researchSchema))}

Rules:
- Preserve the report's findings, evidence limitations, and source references.
- Do not add facts or invent sources.
- Mark a source verified only if the report says its content was retrieved and read.
- If verification is unclear, use verified: false.
- Record unavailable evidence in gaps; do not hide it with an empty array.
- Use source IDs S1, S2, etc. for new sources and preserve existing IDs exactly.
- Every finding.sourceId must refer to a source in sources.
- Return JSON only, without Markdown fences.

Research task and existing context:
${prompt}

Research report:
${report.text}`,
    { structuredOutput: { schema: researchSchema } },
  );

  const research = researchSchema.parse(formatted.object);
  const sourceIds = new Set(research.sources.map((source) => source.id));
  if (sourceIds.size !== research.sources.length) {
    throw new Error("Research returned duplicate source IDs");
  }
  for (const finding of research.findings) {
    if (!sourceIds.has(finding.sourceId)) {
      throw new Error(`Finding references unknown source ${finding.sourceId}`);
    }
  }
  return research;
}
