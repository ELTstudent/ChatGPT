import { z } from "zod";

export const FocusAreaSchema = z.enum([
  "ask",
  "love",
  "career",
  "money",
  "self",
  "social",
  "family",
]);

export const TonePreferenceSchema = z.enum(["soft", "balanced", "direct"]);

export const RelationshipStatusSchema = z.enum([
  "single",
  "dating",
  "in_relationship",
  "complicated",
  "married",
  "prefer_not_to_say",
]);

export const CardArcanaSchema = z.enum(["major", "minor"]);
export const CardSuitSchema = z.enum([
  "wands",
  "cups",
  "swords",
  "pentacles",
  "major",
]);

export const TarotCardSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(2),
  nameTr: z.string().min(2),
  arcana: CardArcanaSchema,
  suit: CardSuitSchema,
  rank: z.string().min(1),
  uprightKeywords: z.array(z.string().min(2)).min(2),
  reversedKeywords: z.array(z.string().min(2)).min(2),
  energy: z.string().min(2),
});

export const DrawnCardSchema = TarotCardSchema.pick({
  id: true,
  slug: true,
  nameTr: true,
  arcana: true,
  suit: true,
  rank: true,
  uprightKeywords: true,
  reversedKeywords: true,
  energy: true,
}).extend({
  orientation: z.enum(["upright", "reversed"]),
  position: z.enum(["past", "present", "near_future"]),
});

export const UserContextSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(40).optional(),
  primaryFocus: FocusAreaSchema.optional(),
  tonePreference: TonePreferenceSchema.default("balanced"),
  relationshipStatus: RelationshipStatusSchema.optional(),
  recentTopics: z.array(z.string().min(2).max(60)).max(8).default([]),
  savedThemes: z.array(z.string().min(2).max(60)).max(8).default([]),
  favoriteSpreadTypes: z.array(z.string().min(2).max(40)).max(5).default([]),
});

export const ReadingRequestSchema = z.object({
  focusArea: FocusAreaSchema,
  intention: z.string().trim().min(0).max(280).optional(),
  tonePreference: TonePreferenceSchema.optional(),
  cardCount: z.union([z.literal(1), z.literal(3)]).default(3),
  cards: z.array(DrawnCardSchema).min(1).max(3),
  userContext: UserContextSchema.optional(),
  locale: z.literal("tr-TR").default("tr-TR"),
});

export const ReadingResultSchema = z.object({
  headline: z.string().min(8).max(120),
  summary: z.string().min(40).max(360),
  interpretation: z.string().min(120).max(1200),
  emotionalReflection: z.string().min(40).max(320),
  reflectionQuestion: z.string().min(12).max(180),
  groundingNote: z.string().min(20).max(220),
  themeTags: z.array(z.string().min(2).max(32)).max(6),
  personalizationSignals: z
    .object({
      usedName: z.boolean(),
      usedRecentThemes: z.boolean(),
      usedTonePreference: z.boolean(),
    })
    .default({
      usedName: false,
      usedRecentThemes: false,
      usedTonePreference: false,
    }),
});

export const ReadingResponseSchema = z.object({
  success: z.boolean(),
  reading: ReadingResultSchema,
  cards: z.array(DrawnCardSchema).min(1).max(3),
  meta: z.object({
    provider: z.string().min(2),
    generatedAt: z.string().datetime(),
    fallbackUsed: z.boolean().default(false),
  }),
});

export type FocusArea = z.infer<typeof FocusAreaSchema>;
export type TonePreference = z.infer<typeof TonePreferenceSchema>;
export type RelationshipStatus = z.infer<typeof RelationshipStatusSchema>;
export type TarotCard = z.infer<typeof TarotCardSchema>;
export type DrawnCard = z.infer<typeof DrawnCardSchema>;
export type UserContext = z.infer<typeof UserContextSchema>;
export type ReadingRequest = z.infer<typeof ReadingRequestSchema>;
export type ReadingResult = z.infer<typeof ReadingResultSchema>;
export type ReadingResponse = z.infer<typeof ReadingResponseSchema>;

export type ProviderPayload = {
  request: ReadingRequest;
  prompt: {
    system: string;
    user: string;
    constraints: string[];
    styleHints: string[];
  };
};

export type ProviderResult = {
  output: ReadingResult;
  rawText?: string;
  fallbackUsed: boolean;
};
