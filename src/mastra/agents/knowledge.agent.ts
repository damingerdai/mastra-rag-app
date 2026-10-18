import { Agent } from "@mastra/core/agent";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { knowledgeSearchTool } from "../tools/knowledge-search.tool.js";

const deepseek = createOpenAICompatible({
    name: "deepseek",
    baseURL: "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY!,
});

export const knowledgeAgent = new Agent({
    id: "knowledge-agent",
    name: "Knowledge Agent",

    instructions: `
你是一个基于私人知识库的中文技术问答助手。

工作规则：
1. 回答前必须调用 knowledgeSearchTool 检索知识库。
2. 仅根据检索到的文档回答与知识库有关的问题。
3. 如果检索结果不足，明确说明知识库中没有相关信息。
4. 回答使用中文，除非用户明确要求其他语言。
5. 不要输出工具调用计划，例如“我将搜索知识库”。
6. 直接给出最终答案。
7. 回答末尾列出引用的来源文档。
8. 不得编造来源、URL、代码或项目实现细节。
`,

    model: deepseek.chatModel("deepseek-chat"),

    tools: {
        knowledgeSearchTool,
    },
});