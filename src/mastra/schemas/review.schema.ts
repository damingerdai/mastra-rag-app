
import { z } from "zod";

/**
 * 单个审核问题
 */
export const reviewIssueSchema = z.object({
  severity: z.enum(["high", "medium", "low"]),
  description: z.string(),
  suggestedFix: z.string(),
});

/**
 * LLM Structured Output Schema
 *
 * 所有字段必填，避免 OpenAI Strict JSON Schema
 * 因 optional 字段报错。
 */
export const reviewSchema = z.object({
  decision: z.enum(["approve", "revise", "research"]),

  // 必须返回评分，不需要评分时可返回 null
  score: z.number().min(0).max(100).nullable(),

  issues: z.array(reviewIssueSchema),

  feedback: z.string(),
});

/**
 * 业务规则校验
 *
 * 与 LLM 输出 Schema 分离。
 */
export const validatedReviewSchema = reviewSchema.superRefine(
  (review, ctx) => {
    if (
      review.decision !== "approve" &&
      review.issues.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["issues"],
        message:
          "revise/research decisions must include actionable issues",
      });
    }

    if (
      review.decision === "approve" &&
      review.issues.some(
        (issue) => issue.severity === "high",
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["decision"],
        message:
          "Cannot approve a draft with high-severity issues",
      });
    }
  },
);

export type ReviewResult = z.infer<typeof reviewSchema>;
export type ReviewIssue = z.infer<typeof reviewIssueSchema>;
