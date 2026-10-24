
import "dotenv/config";

import { mkdir, readFile, writeFile } from "node:fs/promises";

import { articleWorkflow } from "../mastra/workflows/article.workflow.js";
import { researchSchema } from "../mastra/schemas/research.schema.js";
import { analysisSchema } from "../mastra/schemas/analysis.schema.js";
import { draftSchema } from "../mastra/schemas/draft.schema.js";

async function readJson(path: string): Promise<unknown> {
  const content = await readFile(path, "utf8");
  return JSON.parse(content);
}

async function main() {
  // 1. 读取之前三个 Agent 的执行结果
  const research = researchSchema.parse(
    await readJson("./tmp/research-result.json"),
  );

  const analysis = analysisSchema.parse(
    await readJson("./tmp/analysis-result.json"),
  );

  const draft = draftSchema.parse(
    await readJson("./tmp/draft-result.json"),
  );

  // 2. 创建 Workflow Run
  const run = await articleWorkflow.createRun();

  // 3. 执行 Workflow
  const result = await run.start({
    inputData: {
      research,
      analysis,
      draft,
      maxReviews: 3,
    },
  });

  // 4. 检查执行状态
  if (result.status !== "success") {
    console.error("Workflow failed:", result);
    process.exitCode = 1;
    return;
  }

  const output = result.result;

  // 5. 保存 Workflow 结果
  await mkdir("./tmp", { recursive: true });

  await writeFile(
    "./tmp/article-workflow-result.json",
    JSON.stringify(output, null, 2),
    "utf8",
  );

  // 6. 保存最新草稿
  await writeFile(
    "./tmp/article-workflow-draft.md",
    `# ${output.draft.title}\n\n${output.draft.content}`,
    "utf8",
  );

  // 7. 只有审核通过才生成最终文章
  if (output.status === "approved") {
    await writeFile(
      "./tmp/article-final.md",
      `# ${output.draft.title}\n\n${output.draft.content}`,
      "utf8",
    );
  }

  // 8. 输出执行摘要
  console.log("\n=== Article Workflow Result ===");

  console.log({
    status: output.status,
    reviewCount: output.reviewCount,
    decisions: output.reviewHistory.map(
      (review) => review.decision,
    ),
    title: output.draft.title,
  });

  console.log("\nReview History:");

  for (const [index, review] of output.reviewHistory.entries()) {
    console.log(`\nReview #${index + 1}`);
    console.log(`Decision: ${review.decision}`);
    console.log(`Feedback: ${review.feedback}`);

    for (const issue of review.issues) {
      console.log(
        `- [${issue.severity}] ${issue.description}`,
      );
      console.log(`  Fix: ${issue.suggestedFix}`);
    }
  }

  console.log("\nFiles saved to ./tmp/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
