import { z } from "zod";
import { drawToolSchema } from "./drawing";

/**
 * Tier-1 ephemeral broadcast payloads on `room:{roomId}:live` — see
 * docs/phase-1/05-sync-protocol.md §3. Never written to Postgres directly;
 * Tier-2 persistence happens separately on drag-end / stroke-end. More
 * `kind`s (reactions, typing indicators) arrive in later phases.
 */
export const liveEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("object_drag"),
    objectId: z.string().uuid(),
    x: z.number(),
    y: z.number(),
    by: z.string().uuid()
  }),
  z.object({
    kind: z.literal("stroke_point"),
    strokeId: z.string(),
    points: z.array(z.tuple([z.number(), z.number()])),
    color: z.string(),
    width: z.number(),
    tool: drawToolSchema,
    by: z.string().uuid()
  }),
  z.object({
    kind: z.literal("stroke_end"),
    strokeId: z.string(),
    by: z.string().uuid()
  }),
  z.object({
    kind: z.literal("cursor"),
    x: z.number(),
    y: z.number(),
    by: z.string().uuid()
  })
]);
export type LiveEvent = z.infer<typeof liveEventSchema>;
