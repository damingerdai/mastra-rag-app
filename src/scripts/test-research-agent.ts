
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";

import { researchAgent } from "../mastra/agents/research.agent.js";
import { researchFormatterAgent } from "../mastra/agents/research-formatter.agent.js";
import { researchSchema } from "../mastra/schemas/research.schema.js";

async function main() {
    // Step 1: Research
    const research = await researchAgent.generate(
        `研究 Argon2id 相比 MD5 的密码存储优势。
     请检索知识库，列出证据来源，
     区分事实、推断和证据缺口。`,
    );

    console.log("Research completed.");

    // Step 2: Structured handoff

    const formatted = await researchFormatterAgent.generate(
        `
  Convert the following research report into JSON.

  You MUST follow this exact structure:

  {
    "topic": "string",
    "findings": [
      {
        "claim": "string",
        "sourceId": "S1",
        "confidence": "high"
      }
    ],
    "sources": [
      {
        "id": "S1",
        "title": "string",
        "url": null,
        "verified": true
      }
    ],
    "gaps": ["string"],
    "summary": "string"
  }

  STRICT RULES:
  - Return a valid JSON object.
  - Never use "statement"; use "claim".
  - Never use "source"; use "sourceId".
  - Never use "type"; use "confidence".
  - confidence MUST be high, medium, or low.
  - Every source MUST include verified as a boolean.
  - Only mark a source verified when its content was read.
  - Do not invent confidence or verification evidence.
    Use "low" when confidence cannot be established.
  - Preserve all important research findings.
  - Do not add new factual claims.

  Research report:
  ${research.text}
  `,
        {
            structuredOutput: {
                schema: researchSchema,
            },
        },
    );


    const result = researchSchema.parse(formatted.object);

    console.log(JSON.stringify(result, null, 2));

    // result 是已通过 researchSchema 验证的对象
    await mkdir("./tmp", { recursive: true });

    await writeFile(
        "./tmp/research-result.json",
        JSON.stringify(result, null, 2),
        "utf8",
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
