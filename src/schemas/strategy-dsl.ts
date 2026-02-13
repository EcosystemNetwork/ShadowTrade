import { z } from "zod/v4";

// --- Condition Types ---
export const ConditionTypeEnum = z.enum([
  "price_below",
  "price_above",
  "funding_below",
  "funding_above",
  "volatility_above",
]);
export type ConditionType = z.infer<typeof ConditionTypeEnum>;

export const ConditionSchema = z.object({
  type: ConditionTypeEnum,
  value: z.number().positive(),
});
export type Condition = z.infer<typeof ConditionSchema>;

// --- Action Types ---
export const ActionTypeEnum = z.enum(["swap"]);

export const ActionSchema = z.object({
  type: ActionTypeEnum,
  amount_usdc: z.number().positive(),
  direction: z.enum(["buy", "sell"]),
});
export type Action = z.infer<typeof ActionSchema>;

// --- Controls ---
export const ControlsSchema = z.object({
  max_slippage_bps: z.number().int().min(1).max(500),
  approval_mode: z.enum(["auto", "manual"]),
  expires_in_minutes: z.number().int().positive(),
});
export type Controls = z.infer<typeof ControlsSchema>;

// --- Strategy DSL ---
export const StrategyDSLSchema = z.object({
  pair: z.string().min(1),
  conditions: z.array(ConditionSchema).min(1),
  actions: z.array(ActionSchema).min(1),
  controls: ControlsSchema,
});
export type StrategyDSL = z.infer<typeof StrategyDSLSchema>;
