
import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { fullArticleWorkflow } from "../mastra/workflows/full-article.workflow.js";

async function main() {
  const topic =
    process.argv.slice(2).join(" ") ||
    "Go 后端为什么应该将密码存储从 MD5 迁移到 Argon2id？";

  const run = await fullArticleWorkflow.createRun();

  const result = await run.start({
    inputData: {
      topic,
      maxReviews: 3,
      maxResearchRounds: 1,
    },
  });

  if (result.status !== "success") {
    console.error("Workflow failed:", result);
    process.exitCode = 1;
    return;
  }

  const output = result.result;

  await mkdir("./tmp/full-article", { recursive: true });

  await writeFile(
    "./tmp/full-article/result.json",
    JSON.stringify(output, null, 2),
    "utf8",
  );

  await writeFile(
    "./tmp/full-article/draft.md",
    `# ${output.draft.title}\n\n${output.draft.content}`,
    "utf8",
  );

  if (output.status === "approved") {
    await writeFile(
      "./tmp/full-article/final.md",
      `# ${output.draft.title}\n\n${output.draft.content}`,
      "utf8",
    );
  }

  console.log("\n=== Full Article Workflow ===");
  console.log({
    topic: output.topic,
    status: output.status,
    reviewCount: output.reviewCount,
    researchRounds: output.researchRounds,
    decisions: output.reviewHistory.map((r) => r.decision),
    title: output.draft.title,
  });

  for (const [index, review] of output.reviewHistory.entries()) {
    console.log(`\nReview #${index + 1}: ${review.decision}`);
    console.log(review.feedback);

    for (const issue of review.issues) {
      console.log(`- [${issue.severity}] ${issue.description}`);
      console.log(`  Fix: ${issue.suggestedFix}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
