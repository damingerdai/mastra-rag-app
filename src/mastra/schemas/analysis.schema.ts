
import { z } from "zod";

const riskSchema = z.object({
  description: z.string(),
  sourceIds: z.array(z.string()),
});

const risksSchema = z.preprocess(
  (value) => {
    if (!Array.isArray(value)) {
      return value;
    }

    return value.map((item) => {
      if (typeof item === "string") {
        return {
          description: item,
          sourceIds: [],
        };
      }

      if (
        item !== null &&
        typeof item === "object" &&
        "risk" in item &&
        typeof item.risk === "string"
      ) {
        return {
          description: item.risk,
          sourceIds:
            "sourceIds" in item
              ? item.sourceIds
              : [],
        };
      }

      return item;
    });
  },
  z.array(riskSchema),
);

export const analysisSchema = z.object({
  topic: z.string(),

  keyPoints: z.array(
    z.object({
      point: z.string(),
      sourceIds: z.array(z.string()),
      importance: z.enum(["high", "medium", "low"]),
    }),
  ),

  outline: z.array(
    z.object({
      heading: z.string(),
      description: z.string(),
      sourceIds: z.array(z.string()),
    }),
  ),

  risks: risksSchema,

  missingEvidence: z.array(z.string()),

  needsMoreResearch: z.boolean(),

  summary: z.string(),
});

export type AnalysisResult =
  z.infer<typeof analysisSchema>;
