
import "dotenv/config";

import {
  readFile,
  mkdir,
  writeFile,
} from "node:fs/promises";

import { writerAgent } from "../mastra/agents/writer.agent.js";
import { researchSchema } from "../mastra/schemas/research.schema.js";
import { analysisSchema } from "../mastra/schemas/analysis.schema.js";
import { draftSchema } from "../mastra/schemas/draft.schema.js";

async function main() {
  const research = researchSchema.parse(
    JSON.parse(
      await readFile(
        "./tmp/research-result.json",
        "utf8",
      ),
    ),
  );

  const analysis = analysisSchema.parse(
    JSON.parse(
      await readFile(
        "./tmp/analysis-result.json",
        "utf8",
      ),
    ),
  );

  const response = await writerAgent.generate(
    `
Write a technical blog article.

Return JSON with exactly these properties:
title, description, tags, categories,
content, usedSourceIds, notes.

Article positioning:
- Chinese engineering practice article.
- Target audience: Go backend developers.
- Follow AnalysisResult.outline.
- Be explicit about unverified references.
- Do not fabricate code snippets or benchmarks.
- If evidence is insufficient, qualify the claim.

ResearchResult:
${JSON.stringify(research, null, 2)}

AnalysisResult:
${JSON.stringify(analysis, null, 2)}
    `,
    {
      structuredOutput: {
        schema: draftSchema,
      },
    },
  );

  const draft = draftSchema.parse(response.object);

  // 验证来源引用
  const knownSourceIds = new Set(
    research.sources.map((source) => source.id),
  );

  for (const sourceId of draft.usedSourceIds) {
    if (!knownSourceIds.has(sourceId)) {
      throw new Error(
        `Unknown source: ${sourceId}`,
      );
    }
  }

  // 验证正文中的 [S1] 等引用
  const citedIds = [
    ...draft.content.matchAll(/\[(S\d+)\]/g),
  ].map((match) => match[1])
    .filter((id): id is string => id !== undefined);

  for (const sourceId of citedIds) {
    if (!knownSourceIds.has(sourceId)) {
      throw new Error(
        `Unknown citation: ${sourceId}`,
      );
    }
  }

  const uniqueCitedIds = [...new Set(citedIds)];
  const declaredIds = [...new Set(draft.usedSourceIds)];

  if (
    uniqueCitedIds.some((id) => !declaredIds.includes(id)) ||
    declaredIds.some((id) => !uniqueCitedIds.includes(id))
  ) {
    throw new Error(
      "usedSourceIds does not match article citations",
    );
  }

  await mkdir("./tmp", { recursive: true });

  await writeFile(
    "./tmp/draft-result.json",
    JSON.stringify(draft, null, 2),
    "utf8",
  );

  await writeFile(
    "./tmp/article-draft.md",
    `# ${draft.title}\n\n${draft.content}`,
    "utf8",
  );

  console.log({
    title: draft.title,
    sections: (draft.content.match(/^## /gm) ?? []).length,
    usedSourceIds: draft.usedSourceIds,
    notes: draft.notes,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
