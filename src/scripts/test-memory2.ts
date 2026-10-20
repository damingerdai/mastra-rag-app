import "dotenv/config";

import { mastra } from "../mastra/index.js";
import type { AgentMemoryOption } from "@mastra/core/agent";

const agent = mastra.getAgent("knowledgeAgent");

const memory: AgentMemoryOption = {
    resource: "user-001",
    thread: "thread-001",
}

const firstResponse = await agent.generate("请记住一个测试信息：我的测试代号是 Blue-Penguin-729。只回复 OK。", {
    memory,
});

console.log("First Response:", firstResponse.text);

const secondResponse = await agent.generate("我的测试代号是什么？不要调用知识库，只根据对话历史回答。", {
    memory,
});

console.log("Second Response:", secondResponse.text);