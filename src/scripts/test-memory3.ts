import "dotenv/config";

import { mastra } from "../mastra/index.js";
import type { AgentMemoryOption } from "@mastra/core/agent";

const agent = mastra.getAgent("knowledgeAgent");

const memory: AgentMemoryOption = {
    resource: "user-001",
    thread: "thread-001",
}

const firstResponse = await agent.generate("我之前告诉过你的测试代号是什么", {
    memory,
});

console.log("First Response:", firstResponse.text);
