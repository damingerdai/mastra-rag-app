import "dotenv/config";
import assert from "node:assert/strict";
import { researchAgent } from "../mastra/agents/research.agent.js";
import { researchFormatterAgent } from "../mastra/agents/research-formatter.agent.js";
import { conductResearch } from "../mastra/services/research.service.js";

// Offline regression checks: no provider or database calls.
const originalResearch = researchAgent.generate;
const originalFormatter = researchFormatterAgent.generate;
const result = {
  topic: "Test topic",
  findings: [{ claim: "Test finding", sourceId: "S1", confidence: "low" }],
  sources: [{ id: "S1", title: "Test source", url: null, verified: false }],
  gaps: ["Source has not been verified"],
  summary: "Test summary",
};
let report = "Research report with evidence limitations";
let output: unknown = result;
let formatterCalls = 0;

try {
  researchAgent.generate = (async (...args: unknown[]) => {
    assert.deepEqual(args[1], { maxSteps: 8 }, "Retrieval needs tool iterations without structured output");
    return { text: report };
  }) as unknown as typeof originalResearch;
  researchFormatterAgent.generate = (async (prompt: string) => {
    formatterCalls++;
    assert.ok(prompt.includes(report));
    for (const field of ["topic", "findings", "sources", "gaps", "summary"]) {
      assert.ok(prompt.includes(`"${field}"`), `Missing schema field ${field}`);
    }
    assert.ok(prompt.includes("Keep existing source IDs stable"));
    return { object: output };
  }) as unknown as typeof originalFormatter;

  const prompt = "Test topic. Keep existing source IDs stable";
  assert.deepEqual(await conductResearch(prompt), result);
  output = { findings: result.findings, sources: result.sources };
  await assert.rejects(conductResearch(prompt), /topic|gaps|summary/);
  output = { ...result, findings: [{ ...result.findings[0], sourceId: "S9" }] };
  await assert.rejects(conductResearch(prompt), /unknown source S9/);
  output = { ...result, sources: [...result.sources, ...result.sources] };
  await assert.rejects(conductResearch(prompt), /duplicate source IDs/);
  const callsBefore = formatterCalls;
  report = " ";
  await assert.rejects(conductResearch(prompt), /empty report/);
  assert.equal(formatterCalls, callsBefore);
  console.log("Research service: 5 offline regression checks passed.");
} finally {
  researchAgent.generate = originalResearch;
  researchFormatterAgent.generate = originalFormatter;
}
