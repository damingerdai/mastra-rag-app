import "dotenv/config";

import { mastra } from "../mastra/index.js";
import type { AgentMemoryOption } from "@mastra/core/agent";

const agent = mastra.getAgent("knowledgeAgent");

const resource = "user-001";

// Thread A：写入偏好
await agent.generate(
  "请记住，我最喜欢的编程语言是 Rust。",
  {
    memory: {
      resource,
      thread: "working-memory-a",
    },
  },
);

// Thread B：读取偏好
const response = await agent.generate(
  "我最喜欢的编程语言是什么？",
  {
    memory: {
      resource,
      thread: "working-memory-b",
    },
  },
);

console.log(response.text);

const response2 = await agent.generate(
  "我最喜欢的编程语言是什么？",
  {
    memory: {
      resource: "user-002",
      thread: "working-memory-c",
    },
  },
);

console.log(response2.text);