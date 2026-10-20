import "dotenv/config";

import { mastra } from "../mastra/index.js";
import type { AgentMemoryOption } from "@mastra/core/agent";

const agent = mastra.getAgent("knowledgeAgent");

const memory: AgentMemoryOption = {
    resource: "user-001",
    thread: "thread-001",
}

const firstResponse = await agent.generate("Health Master 为什么从 MD5 迁移到 Argon2id？", {
    memory,
});

console.log("First Response:", firstResponse.text);

const secondResponse = await agent.generate("请详细说明 Argon2id 的优势", {
    memory,
});

console.log("Second Response:", secondResponse.text);