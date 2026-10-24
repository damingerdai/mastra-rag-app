
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { writerAgent } from "../agents/writer.agent.js";
import { reviewerAgent } from "../agents/reviewer.agent.js";

import { researchSchema } from "../schemas/research.schema.js";
import { analysisSchema } from "../schemas/analysis.schema.js";
import { draftSchema } from "../schemas/draft.schema.js";
import { reviewSchema } from "../schemas/review.schema.js";

// Workflow 内部使用规范化后的 ReviewResult。
// 避免直接把带 z.preprocess 的 Schema 用作循环状态。
const reviewResultSchema = z.object({
  decision: z.enum(["approve", "revise", "research"]),
  score: z.number().min(0).max(100).optional(),
  issues: z.array(
    z.object({
      severity: z.enum(["high", "medium", "low"]),
      description: z.string(),
      suggestedFix: z.string(),
    }),
  ),
  feedback: z.string(),
});

const loopSchema = z.object({
  research: researchSchema,
  analysis: analysisSchema,
  draft: draftSchema,
  review: reviewResultSchema.optional(),
  reviewHistory: z.array(reviewResultSchema),
  reviewCount: z.number().int().nonnegative(),
  maxReviews: z.number().int().min(1).max(10),
  status: z.enum([
    "pending",
    "approved",
    "needs_research",
    "max_reviews_reached",
  ]),
});

const inputSchema = z.object({
  research: researchSchema,
  analysis: analysisSchema,
  draft: draftSchema,
  maxReviews: z.number().int().min(1).max(10).default(3),
});

const initializeStep = createStep({
  id: "initialize-article",
  inputSchema,
  outputSchema: loopSchema,

  execute: async ({ inputData }) => ({
    ...inputData,
    reviewCount: 0,
    reviewHistory: [],
    status: "pending" as const,
  }),
});

const reviewAndReviseStep = createStep({
  id: "review-and-revise",
  inputSchema: loopSchema,
  outputSchema: loopSchema,

  execute: async ({ inputData }) => {
    const {
      research,
      analysis,
      draft,
      reviewHistory,
      reviewCount,
      maxReviews,
    } = inputData;

    // 1. Reviewer 审核当前草稿
    const reviewResponse = await reviewerAgent.generate(
      `
Review this article.

ResearchResult:
${JSON.stringify(research)}

AnalysisResult:
${JSON.stringify(analysis)}

DraftResult:
${JSON.stringify(draft)}

Return:
- decision: approve | revise | research
- issues: array of actionable issues
- feedback: Chinese review summary

If approved, return issues: [] when no blocking issues exist.
If revise or research, provide actionable issues.
      `,
      {
        structuredOutput: {
          schema: reviewSchema,
        },
      },
    );

    const review = reviewSchema.parse(reviewResponse.object);
    const nextReviewCount = reviewCount + 1;
    const nextHistory = [...reviewHistory, review];

    console.log(
      `[Review ${nextReviewCount}/${maxReviews}]`,
      review.decision,
    );

    // 2. 审核通过
    if (review.decision === "approve") {
      return {
        ...inputData,
        review,
        reviewHistory: nextHistory,
        reviewCount: nextReviewCount,
        status: "approved" as const,
      };
    }

    // 3. 需要重新研究：第一阶段暂不自动处理
    if (review.decision === "research") {
      return {
        ...inputData,
        review,
        reviewHistory: nextHistory,
        reviewCount: nextReviewCount,
        status: "needs_research" as const,
      };
    }

    // 4. 达到审核上限：停止，不再生成未审核的版本
    if (nextReviewCount >= maxReviews) {
      return {
        ...inputData,
        review,
        reviewHistory: nextHistory,
        reviewCount: nextReviewCount,
        status: "max_reviews_reached" as const,
      };
    }

    // 5. revise：将审核意见交给 Writer
    const writerResponse = await writerAgent.generate(
      `
Revise the existing Chinese technical article.

Keep the original topic, outline, and verified facts.
Fix the review issues without inventing new evidence.

Do not invent citations, benchmarks, or source IDs.
Preserve the article's Markdown format.

ResearchResult:
${JSON.stringify(research)}

AnalysisResult:
${JSON.stringify(analysis)}

Current DraftResult:
${JSON.stringify(draft)}

Reviewer Feedback:
${JSON.stringify(review)}

Return JSON containing:
title, description, tags, categories,
content, usedSourceIds, notes.
      `,
      {
        structuredOutput: {
          schema: draftSchema,
        },
      },
    );

    const revisedDraft = draftSchema.parse(
      writerResponse.object,
    );

    // 6. 确定性校验：不能引用不存在的来源
    const knownSources = new Set(
      research.sources.map((source) => source.id),
    );

    for (const id of revisedDraft.usedSourceIds) {
      if (!knownSources.has(id)) {
        throw new Error(`Unknown source ID: ${id}`);
      }
    }

    const citedIds = new Set(
      [...revisedDraft.content.matchAll(/\[(S\d+)\]/g)]
        .map((match) => match[1]),
    );

    const declaredIds = new Set(revisedDraft.usedSourceIds);

    for (const id of citedIds) {
      if (!knownSources.has(id!) || !declaredIds.has(id!)) {
        throw new Error(`Invalid citation: ${id}`);
      }
    }

    for (const id of declaredIds) {
      if (!citedIds.has(id)) {
        throw new Error(`Unused source ID: ${id}`);
      }
    }

    return {
      ...inputData,
      draft: revisedDraft,
      review,
      reviewHistory: nextHistory,
      reviewCount: nextReviewCount,
      status: "pending" as const,
    };
  },
});

const resultSchema = loopSchema;

const finalizeStep = createStep({
  id: "finalize-article",
  inputSchema: loopSchema,
  outputSchema: resultSchema,

  execute: async ({ inputData }) => inputData,
});

export const articleWorkflow = createWorkflow({
  id: "article-workflow",
  inputSchema,
  outputSchema: resultSchema,
})
  .then(initializeStep)
  .dountil(
    reviewAndReviseStep,
    async ({ inputData }) =>
      inputData.status !== "pending",
  )
  .then(finalizeStep)
  .commit();
