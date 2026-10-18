import "dotenv/config";
import { inspect } from "node:util";
import { knowledgeAgent } from "../mastra/agents/knowledge.agent.js";

const question =
    process.argv.slice(2).join(" ") ||
    "Health Master 为什么从 MD5 迁移到 Argon2id？";

const response = await knowledgeAgent.generate(question);

console.log("\n========== TOOL CALLS ==========");
for (const [index, step] of response.steps.entries()) {
    console.log(`\n========== STEP ${index + 1} ==========`);

    console.log(
        "Tool Calls:",
        inspect(step.toolCalls, {
            depth: 6,
            colors: true,
        }),
    );

    console.log(
        "Tool Results:",
        inspect(step.toolResults, {
            depth: 6,
            colors: true,
        }),
    );

    console.log("Step Text:", step.text);
}

console.log("\n========== ANSWER ==========");
console.log(response.text);