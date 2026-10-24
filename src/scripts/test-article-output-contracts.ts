import "dotenv/config";
import assert from "node:assert/strict";
import { analysisAgent } from "../mastra/agents/analysis.agent.js";
import { writerAgent } from "../mastra/agents/writer.agent.js";
import { reviewerAgent } from "../mastra/agents/reviewer.agent.js";
import { analysisSchema } from "../mastra/schemas/analysis.schema.js";
import { draftSchema } from "../mastra/schemas/draft.schema.js";
import { reviewSchema } from "../mastra/schemas/review.schema.js";

// Exercise the real SDK request path with a local provider response.
const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY ??= "offline-test-key";
let responseObject: unknown;
let expectedFields: string[] = [];
let requests = 0;
const queuedOutputs: unknown[] = [];
globalThis.fetch = async (input, init) => {
  requests++;
  assert.equal(String(input), "https://api.bianxie.ai/v1/responses");
  const body = JSON.parse(String(init?.body));
  assert.equal(body.model, "gpt-4.1-mini");
  if (queuedOutputs.length > 0) {
    responseObject = queuedOutputs.shift();
  } else {
    assert.equal(body.text.format.type, "json_schema");
  }
  const messages = JSON.stringify(body.input);
  for (const field of expectedFields) {
    assert.ok(messages.includes(field), `Schema field missing from request: ${field}`);
  }
  return new Response(JSON.stringify({
    id: "offline-test",
    object: "response",
    created_at: 0,
    status: "completed",
    model: "gpt-4.1-mini",
    output: [{
      id: "msg-test",
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: JSON.stringify(responseObject), annotations: [] }],
    }],
    usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
  }), { headers: { "content-type": "application/json" } });
};

try {
  responseObject = {
    topic: "Test", keyPoints: [{ point: "Claim", sourceIds: ["S1"], importance: "high" }],
    outline: [{ heading: "Section", description: "Explain claim", sourceIds: ["S1"] }],
    risks: [], missingEvidence: [], needsMoreResearch: false, summary: "Summary",
  };
  expectedFields = ["point", "importance", "heading", "sourceIds", "missingEvidence", "summary"];
  const analysis = await analysisAgent.generate("Analyze test evidence.", {
    structuredOutput: { schema: analysisSchema },
  });
  assert.deepEqual(analysis.object, responseObject);
  assert.equal(analysisSchema.safeParse({ keyPoints: ["Claim"], outline: ["Section"] }).success, false);

  responseObject = {
    title: "Test", description: "Test", tags: [], categories: [],
    content: "Claim [S1]", usedSourceIds: ["S1"], notes: [],
  };
  expectedFields = ["title", "description", "tags", "categories", "content", "usedSourceIds", "notes"];
  const draft = await writerAgent.generate("Write a test article.", {
    structuredOutput: { schema: draftSchema },
  });
  assert.deepEqual(draft.object, responseObject);

  responseObject = { decision: "approve", issues: [], feedback: "OK" };
  expectedFields = ["decision", "issues", "severity", "description", "suggestedFix", "feedback"];
  const review = await reviewerAgent.generate("Review a test article.", {
    structuredOutput: { schema: reviewSchema },
  });
  assert.equal(reviewSchema.parse(review.object).decision, "approve");
  assert.equal(requests, 3);
  console.log("Analysis, Writer, Reviewer: SDK request schema and output checks passed.");

  const { fullArticleWorkflow } = await import("../mastra/workflows/full-article.workflow.js");
  expectedFields = [];
  const research = {
    topic: "Test", findings: [{ claim: "Claim", sourceId: "S1", confidence: "low" }],
    sources: [{ id: "S1", title: "Test source", url: null, verified: false }],
    gaps: ["Unverified source"], summary: "Test summary",
  };
  const approve = { decision: "approve", issues: [], feedback: "OK" };
  const revise = {
    decision: "revise", feedback: "Clarify claim",
    issues: [{ severity: "low", description: "Unclear claim", suggestedFix: "Clarify" }],
  };
  for (const needsRevision of [false, true]) {
    queuedOutputs.push("Research report", research, analysis.object, draft.object);
    if (needsRevision) queuedOutputs.push(revise, draft.object);
    queuedOutputs.push(approve);
    const run = await fullArticleWorkflow.createRun();
    const completed = await run.start({ inputData: { topic: "Test", maxReviews: 3, maxResearchRounds: 1 } });
    assert.equal(completed.status, "success");
    if (completed.status !== "success") throw new Error("Workflow did not complete");
    assert.equal(completed.result.status, "approved");
    assert.equal(completed.result.reviewCount, needsRevision ? 2 : 1);
    assert.equal(queuedOutputs.length, 0);
  }
  console.log("Full workflow: approval and revise-then-approval paths passed with mocked API responses.");
  for (const maxResearchRounds of [0, 1]) {
    queuedOutputs.push("Research report", research, analysis.object, draft.object,
      { ...revise, decision: "research" });
    if (maxResearchRounds > 0) {
      queuedOutputs.push("Expanded report", research, analysis.object, draft.object, approve);
    }
    const run = await fullArticleWorkflow.createRun();
    const completed = await run.start({ inputData: { topic: "Test", maxReviews: 3, maxResearchRounds } });
    assert.equal(completed.status, "success");
    if (completed.status !== "success") throw new Error("Workflow did not complete");
    assert.equal(completed.result.status, maxResearchRounds ? "approved" : "needs_research");
    assert.equal(completed.result.researchRounds, maxResearchRounds);
    assert.equal(queuedOutputs.length, 0);
  }
  console.log("Full workflow: research expansion and research limit paths passed with mocked API responses.");
} finally {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
}
