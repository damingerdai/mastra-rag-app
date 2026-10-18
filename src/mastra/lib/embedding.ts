import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const siliconflow = createOpenAICompatible({
    name: "siliconflow",
    apiKey: process.env.SILICONFLOW_API_KEY!,
    baseURL: process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1",
});

export const embeddingModel =
    siliconflow.embeddingModel("BAAI/bge-m3");