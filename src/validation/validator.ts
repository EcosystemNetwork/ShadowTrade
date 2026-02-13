import { StrategyDSLSchema, type StrategyDSL } from "../schemas";

/** Hard limits enforced on every strategy, regardless of parser output. */
export interface ValidationLimits {
  allowed_pairs: string[];
  max_spend_usdc: number;
  max_slippage_bps: number;
}

export interface ValidationResult {
  valid: boolean;
  strategy: StrategyDSL | null;
  errors: string[];
  clamped: string[];
}

/**
 * Deterministic validation & enforcement layer.
 *
 * Validates a parsed Strategy DSL against hard limits.
 * Values that exceed limits are clamped where safe or rejected.
 */
export function validateStrategy(
  dsl: unknown,
  limits: ValidationLimits
): ValidationResult {
  const errors: string[] = [];
  const clamped: string[] = [];

  // 1. Schema validation
  const parsed = StrategyDSLSchema.safeParse(dsl);
  if (!parsed.success) {
    return {
      valid: false,
      strategy: null,
      errors: parsed.error.issues.map((i) => i.message),
      clamped: [],
    };
  }

  const strategy = { ...parsed.data };

  // 2. Pair allowlist
  if (!limits.allowed_pairs.includes(strategy.pair)) {
    errors.push(
      `Pair "${strategy.pair}" is not in the allowlist: [${limits.allowed_pairs.join(", ")}]`
    );
  }

  // 3. Slippage: clamp if above hard max
  if (strategy.controls.max_slippage_bps > limits.max_slippage_bps) {
    clamped.push(
      `max_slippage_bps clamped from ${strategy.controls.max_slippage_bps} to ${limits.max_slippage_bps}`
    );
    strategy.controls = {
      ...strategy.controls,
      max_slippage_bps: limits.max_slippage_bps,
    };
  }

  // 4. Spend: reject if any action exceeds hard cap
  for (const action of strategy.actions) {
    if (action.amount_usdc > limits.max_spend_usdc) {
      errors.push(
        `Action amount ${action.amount_usdc} USDC exceeds hard cap of ${limits.max_spend_usdc} USDC`
      );
    }
  }

  // 5. Expiry required (schema enforces > 0, but double-check)
  if (strategy.controls.expires_in_minutes <= 0) {
    errors.push("Expiry must be a positive number of minutes");
  }

  if (errors.length > 0) {
    return { valid: false, strategy: null, errors, clamped };
  }

  return { valid: true, strategy, errors: [], clamped };
}
