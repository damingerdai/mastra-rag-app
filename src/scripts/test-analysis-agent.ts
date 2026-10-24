
import "dotenv/config";

import { readFile, mkdir, writeFile } from "node:fs/promises";

import { analysisAgent } from "../mastra/agents/analysis.agent.js";
import { analysisSchema } from "../mastra/schemas/analysis.schema.js";
import { researchSchema } from "../mastra/schemas/research.schema.js";

async function main() {
  // 1. 读取 ResearchResult
  const content = await readFile(
    "./tmp/research-result.json",
    "utf8",
  );

  // 2. 校验 Research Agent 的输出
  const research = researchSchema.parse(
    JSON.parse(content),
  );

  // 3. 检查 ResearchResult 的来源引用
  const sourceIds = new Set(
    research.sources.map((source) => source.id),
  );

  for (const finding of research.findings) {
    if (!sourceIds.has(finding.sourceId)) {
      throw new Error(
        `Research references unknown source: ${finding.sourceId}`,
      );
    }
  }

  // 4. Analysis Agent 消费 ResearchResult
  const response = await analysisAgent.generate(
    `
Analyze the following ResearchResult.

Return a valid JSON object matching the provided schema.

Required top-level JSON properties:
- topic
- keyPoints
- outline
- risks
- missingEvidence
- needsMoreResearch
- summary

Each keyPoints item:
{
  "point": "string",
  "sourceIds": ["S1"],
  "importance": "high"
}

Each outline item:
{
  "heading": "string",
  "description": "string",
  "sourceIds": ["S1"]
}

Rules:
- Preserve the source IDs.
- Never invent evidence.
- Make the outline suitable for a technical blog.
- Use Chinese for article content.
- Keep JSON property names in English.
- Do not add unsupported technical conclusions.

ResearchResult:
${JSON.stringify(research, null, 2)}
    `,
    {
      structuredOutput: {
        schema: analysisSchema,
      },
    },
  );

  // 5. 验证 AnalysisResult
  const analysis = analysisSchema.parse(
    response.object,
  );

  // 6. 检查 AnalysisResult 的来源引用
  const references = [
    ...analysis.keyPoints.flatMap(
      (point) => point.sourceIds,
    ),
    ...analysis.outline.flatMap(
      (section) => section.sourceIds,
    ),
  ];

  for (const sourceId of references) {
    if (!sourceIds.has(sourceId)) {
      throw new Error(
        `Analysis references unknown source: ${sourceId}`,
      );
    }
  }

  // 7. 保存 AnalysisResult
  await mkdir("./tmp", { recursive: true });

  await writeFile(
    "./tmp/analysis-result.json",
    JSON.stringify(analysis, null, 2),
    "utf8",
  );

  console.log(
    JSON.stringify(analysis, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
