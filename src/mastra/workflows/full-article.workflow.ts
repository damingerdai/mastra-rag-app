
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { conductResearch } from "../services/research.service.js";
import { analysisAgent } from "../agents/analysis.agent.js";
import { writerAgent } from "../agents/writer.agent.js";
import { reviewerAgent } from "../agents/reviewer.agent.js";

import { researchSchema } from "../schemas/research.schema.js";
import { analysisSchema } from "../schemas/analysis.schema.js";
import { draftSchema } from "../schemas/draft.schema.js";
import { reviewSchema } from "../schemas/review.schema.js";

const inputSchema = z.object({
  topic: z.string().min(1),
  maxReviews: z.number().int().min(1).max(10).default(3),
  maxResearchRounds: z.number().int().min(0).max(5).default(1),
});

const statusSchema = z.enum([
  "pending",
  "approved",
  "needs_research",
  "max_reviews_reached",
]);

const stateSchema = z.object({
  topic: z.string(),
  research: researchSchema,
  analysis: analysisSchema,
  draft: draftSchema,
  review: reviewSchema.optional(),
  reviewHistory: z.array(reviewSchema),
  reviewCount: z.number().int().nonnegative(),
  researchRounds: z.number().int().nonnegative(),
  maxReviews: z.number().int().min(1),
  maxResearchRounds: z.number().int().nonnegative(),
  status: statusSchema,
});

// 确保正文引用的来源存在，且声明的来源确实被使用

function validateCitations(
  research: z.infer<typeof researchSchema>,
  draft: z.infer<typeof draftSchema>,
) {
  const known = new Set(
    research.sources.map((source) => source.id),
  );

  const declared = new Set(draft.usedSourceIds);

  // 支持 [S1]、[S1, S2]、（S1）、(S1)、[S1][S2]
  const citationGroups = [
    ...draft.content.matchAll(
      /[\[（(]((?:S\d+)(?:\s*[,，、;；]\s*S\d+)*)[\]）)]/g,
    ),
  ];

  const cited = new Set(
    citationGroups.flatMap((match) =>
      match[1].match(/S\d+/g) ?? [],
    ),
  );

  // 检查声明的来源是否存在
  for (const id of declared) {
    if (!known.has(id)) {
      throw new Error(`Unknown source: ${id}`);
    }
  }

  // 检查正文中的引用是否存在
  for (const id of cited) {
    if (!known.has(id)) {
      throw new Error(`Invalid citation: ${id}`);
    }
  }

  // 检查正文引用是否已声明
  for (const id of cited) {
    if (!declared.has(id)) {
      throw new Error(`Citation not declared: ${id}`);
    }
  }

  // POC 阶段：只提示声明但未引用的来源，不阻断流程
  for (const id of declared) {
    if (!cited.has(id)) {
      console.warn(
        `[Citation Warning] Declared but unused source: ${id}`,
      );
    }
  }

  console.log("[Citation] Validation passed", {
    declared: [...declared],
    cited: [...cited],
  });
}

const initializeStep = createStep({
  id: "initialize-article",
  inputSchema,
  outputSchema: stateSchema,

  execute: async ({ inputData }) => {
    const { topic } = inputData;

    console.log("[Research] Starting...");

    const research = await conductResearch(
      `Research the following topic for a Chinese engineering article:
${topic}

Use your available knowledge retrieval tools when appropriate.
Do not fabricate sources. Mark unverified evidence explicitly.
Return a complete research report with the topic, findings, sources,
evidence gaps, and summary. Use source IDs S1, S2, etc.
Only mark sources verified when their content was retrieved and read.`,
    );

    console.log("[Analysis] Starting...");

    const analysisResponse = await analysisAgent.generate(
      `Analyze the research and plan a practical Chinese engineering article.

Topic:
${topic}

ResearchResult:
${JSON.stringify(research)}

Return key points, outline, risks, evidence gaps,
and whether further research is needed.`,
      {
        structuredOutput: { schema: analysisSchema },
      },
    );

    const analysis = analysisSchema.parse(analysisResponse.object);

    console.log("[Writer] Creating initial draft...");

    const writerResponse = await writerAgent.generate(
      `Write a Chinese technical article following the analysis outline.

Topic:
${topic}

ResearchResult:
${JSON.stringify(research)}

AnalysisResult:
${JSON.stringify(analysis)}

Use only supported source IDs.
Do not invent benchmarks, quotations, or implementation details.
Clearly distinguish verified evidence from assumptions.
Return the required DraftResult.`,
      {
        structuredOutput: { schema: draftSchema },
      },
    );

    const draft = draftSchema.parse(writerResponse.object);

    validateCitations(research, draft);

    return {
      topic,
      research,
      analysis,
      draft,
      reviewHistory: [],
      reviewCount: 0,
      researchRounds: 0,
      maxReviews: inputData.maxReviews,
      maxResearchRounds: inputData.maxResearchRounds,
      status: "pending" as const,
    };
  },
});

const reviewLoopStep = createStep({
  id: "review-loop",
  inputSchema: stateSchema,
  outputSchema: stateSchema,

  execute: async ({ inputData }) => {
    const {
      topic,
      research,
      analysis,
      draft,
      reviewCount,
      researchRounds,
      maxReviews,
      maxResearchRounds,
    } = inputData;

    // 每一轮都审核当前最新草稿
    const response = await reviewerAgent.generate(
      `Review this Chinese engineering article.

Topic:
${topic}

ResearchResult:
${JSON.stringify(research)}

AnalysisResult:
${JSON.stringify(analysis)}

DraftResult:
${JSON.stringify(draft)}

Return exactly:
{
  "decision": "approve | revise | research",
  "issues": [
    {
      "severity": "high | medium | low",
      "description": "actionable issue",
      "suggestedFix": "specific correction"
    }
  ],
  "feedback": "Chinese review summary"
}

Rules:
- issues must be an array of objects with severity, description, and suggestedFix.
- Use issues: [] when there are no issues.
- approve means no blocking issues.
- revise means the writer can fix the article using existing evidence.
- research means additional evidence is necessary.
- Do not request research merely because the article states its evidence limitations.
- Do not invent evidence.`,
      {
        structuredOutput: { schema: reviewSchema },
      },
    );

    const review = reviewSchema.parse(response.object);
    const nextCount = reviewCount + 1;
    const history = [...inputData.reviewHistory, review];

    console.log(
      `[Review ${nextCount}/${maxReviews}] ${review.decision}`,
    );

    const base = {
      ...inputData,
      review,
      reviewCount: nextCount,
      reviewHistory: history,
    };

    if (review.decision === "approve") {
      return {
        ...base,
        status: "approved" as const,
      };
    }

    // 没有下一次审核机会，就不要再修改草稿
    if (nextCount >= maxReviews) {
      return {
        ...base,
        status: "max_reviews_reached" as const,
      };
    }

    if (review.decision === "research") {
      if (researchRounds >= maxResearchRounds) {
        return {
          ...base,
          status: "needs_research" as const,
        };
      }

      console.log("[Research] Expanding evidence...");

      const updatedResearch = await conductResearch(
        `Expand the existing research to address reviewer feedback.

Topic:
${topic}

Previous ResearchResult:
${JSON.stringify(research)}

Reviewer:
${JSON.stringify(review)}

Preserve valid existing findings and sources.
Keep existing source IDs stable.
Assign new IDs only to genuinely new sources.
Do not invent sources or claim verification without retrieval.
If evidence cannot be found, record the gap.

Return a complete updated research report with the topic, findings,
sources, evidence gaps, and summary.
`,
      );

      // 保护旧引用，避免研究补充后 source ID 失效
      const updatedIds = new Set(
        updatedResearch.sources.map((s) => s.id),
      );

      for (const source of research.sources) {
        const updated = updatedResearch.sources.find(
          (s) => s.id === source.id,
        );

        if (
          !updated ||
          updated.title !== source.title ||
          updated.url !== source.url
        ) {
          throw new Error(
            `Research changed existing source ${source.id}`,
          );
        }
      }

      for (const finding of updatedResearch.findings) {
        if (!updatedIds.has(finding.sourceId)) {
          throw new Error(
            `Finding references unknown source ${finding.sourceId}`,
          );
        }
      }

      console.log("[Analysis] Re-analyzing...");

      const analysisResponse = await analysisAgent.generate(
        `Update the analysis based on expanded research.

Topic:
${topic}

ResearchResult:
${JSON.stringify(updatedResearch)}

Previous AnalysisResult:
${JSON.stringify(analysis)}

Reviewer:
${JSON.stringify(review)}

Return a complete updated AnalysisResult.`,
        {
          structuredOutput: { schema: analysisSchema },
        },
      );

      const updatedAnalysis = analysisSchema.parse(
        analysisResponse.object,
      );

      console.log("[Writer] Rewriting with new research...");

      const writerResponse = await writerAgent.generate(
        `Revise the article using the updated research and analysis.

Topic:
${topic}

ResearchResult:
${JSON.stringify(updatedResearch)}

AnalysisResult:
${JSON.stringify(updatedAnalysis)}

Previous DraftResult:
${JSON.stringify(draft)}

Reviewer:
${JSON.stringify(review)}

Keep supported claims and correct the reported issues.
Do not invent evidence.
Return a complete DraftResult.`,
        {
          structuredOutput: { schema: draftSchema },
        },
      );

      const updatedDraft = draftSchema.parse(
        writerResponse.object,
      );

      validateCitations(updatedResearch, updatedDraft);

      return {
        ...base,
        research: updatedResearch,
        analysis: updatedAnalysis,
        draft: updatedDraft,
        researchRounds: researchRounds + 1,
        status: "pending" as const,
      };
    }

    // revise: 不需要重新研究，直接让 Writer 修订
    console.log("[Writer] Revising from feedback...");

    const writerResponse = await writerAgent.generate(
      `Revise this Chinese engineering article.

Topic:
${topic}

ResearchResult:
${JSON.stringify(research)}

AnalysisResult:
${JSON.stringify(analysis)}

Current DraftResult:
${JSON.stringify(draft)}

Reviewer:
${JSON.stringify(review)}

Address each issue using existing evidence.
Preserve the article's useful content and outline.
Do not invent new source IDs, facts, or benchmarks.
Return a complete DraftResult.`,
      {
        structuredOutput: { schema: draftSchema },
      },
    );

    const updatedDraft = draftSchema.parse(writerResponse.object);
    validateCitations(research, updatedDraft);

    return {
      ...base,
      draft: updatedDraft,
      status: "pending" as const,
    };
  },
});

const finalizeStep = createStep({
  id: "finalize-article",
  inputSchema: stateSchema,
  outputSchema: stateSchema,
  execute: async ({ inputData }) => inputData,
});

export const fullArticleWorkflow = createWorkflow({
  id: "full-article-workflow",
  inputSchema,
  outputSchema: stateSchema,
})
  .then(initializeStep)
  .dountil(
    reviewLoopStep,
    async ({ inputData }) => inputData.status !== "pending",
  )
  .then(finalizeStep)
  .commit();
