
import { z } from "zod";

export const draftSchema = z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    categories: z.array(z.string()),

    content: z.string(),

    usedSourceIds: z.array(z.string()),

    notes: z.preprocess(
        (value) => {
            if (typeof value === "string") {
                return value
                    .split(/(?:^|\n)\s*\d+[.)]\s*/)
                    .map((note) => note.trim())
                    .filter(Boolean);
            }

            return value;
        },
        z.array(z.string()),
    ),
});

export type DraftResult =
    z.infer<typeof draftSchema>;
