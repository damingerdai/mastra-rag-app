import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const deepseek = createOpenAICompatible({
    name: "deepseek",
    baseURL: "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY!,
});