import "dotenv/config";

const { createOpenAICompatible } = await import(
  "@ai-sdk/openai-compatible"
);
const { embed } = await import("ai");

const siliconflow = createOpenAICompatible({
  name: "siliconflow",
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: process.env.SILICONFLOW_API_KEY!,
});

const model = siliconflow.embeddingModel("BAAI/bge-m3");

const result = await embed({
  model,
  value: "Hello, world!",
});

console.log("Dimensions:", result.embedding.length);