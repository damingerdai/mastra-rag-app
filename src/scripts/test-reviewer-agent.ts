
import "dotenv/config";

import {
  readFile,
  writeFile,
} from "node:fs/promises";

import { reviewerAgent } from "../mastra/agents/reviewer.agent.js";
import { researchSchema } from "../mastra/schemas/research.schema.js";
import { analysisSchema } from "../mastra/schemas/analysis.schema.js";
import { draftSchema } from "../mastra/schemas/draft.schema.js";
import { reviewSchema } from "../mastra/schemas/review.schema.js";

async function readJson(path: string) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const research = researchSchema.parse(
    await readJson("./tmp/research-result.json"),
  );

  const analysis = analysisSchema.parse(
    await readJson("./tmp/analysis-result.json"),
  );

  const draft = draftSchema.parse(
    await readJson("./tmp/draft-result.json"),
  );

  const response = await reviewerAgent.generate(
    `
Review this technical article.

Target:
A Chinese engineering-practice blog article,
not a peer-reviewed cryptography paper.

ResearchResult:
${JSON.stringify(research, null, 2)}

AnalysisResult:
${JSON.stringify(analysis, null, 2)}

DraftResult:
${JSON.stringify(draft, null, 2)}
    `,
    {
      structuredOutput: {
        schema: reviewSchema,
      },
    },
  );

  const review = reviewSchema.parse(response.object);

  await writeFile(
    "./tmp/review-result.json",
    JSON.stringify(review, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(review, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
