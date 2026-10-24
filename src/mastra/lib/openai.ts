import { createOpenAI } from "@ai-sdk/openai";
import type { MastraModelConfig } from "@mastra/core/llm";

export const openai = createOpenAI({
  baseURL: "https://api.bianxie.ai/v1",
  apiKey: process.env.OPENAI_API_KEY!,
});

export const workflowModel: MastraModelConfig = {
  id: "bianxie/gpt-4.1-mini",
  url: "https://api.bianxie.ai/v1",
  apiKey: process.env.OPENAI_API_KEY!,
  api: "chat",
};
