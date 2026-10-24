
import { z } from "zod";

export const researchSchema = z.object({
  topic: z.string(),

  findings: z.array(
    z.object({
      claim: z.string(),
      sourceId: z.string(),
      confidence: z.enum([
        "high",
        "medium",
        "low",
      ]),
    }),
  ),

  sources: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string().nullable(),
      verified: z.boolean(),
    }),
  ),

  gaps: z.array(z.string()),

  summary: z.string(),
});

export type ResearchResult =
  z.infer<typeof researchSchema>;
