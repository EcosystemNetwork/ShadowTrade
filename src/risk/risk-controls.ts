import type { StrategyDSL } from "../schemas";

/** Risk control configuration. */
export interface RiskConfig {
  max_spend_usdc: number;
  max_slippage_bps: number;
  allowed_pairs: string[];
  max_expires_minutes: number;
}

export interface RiskCheckResult {
  passed: boolean;
  violations: string[];
}

/**
 * Risk Controls.
 *
 * Final safety check before execution. Ensures the strategy
 * still conforms to all hard limits at execution time.
 */
export function checkRisk(
  strategy: StrategyDSL,
  config: RiskConfig
): RiskCheckResult {
  const violations: string[] = [];

  // Pair allowlist
  if (!config.allowed_pairs.includes(strategy.pair)) {
    violations.push(`Pair "${strategy.pair}" not in allowlist`);
  }

  // Spend cap
  const totalSpend = strategy.actions.reduce(
    (sum, a) => sum + a.amount_usdc,
    0
  );
  if (totalSpend > config.max_spend_usdc) {
    violations.push(
      `Total spend ${totalSpend} USDC exceeds cap of ${config.max_spend_usdc} USDC`
    );
  }

  // Slippage
  if (strategy.controls.max_slippage_bps > config.max_slippage_bps) {
    violations.push(
      `Slippage ${strategy.controls.max_slippage_bps} bps exceeds max of ${config.max_slippage_bps} bps`
    );
  }

  // Expiry
  if (strategy.controls.expires_in_minutes > config.max_expires_minutes) {
    violations.push(
      `Expiry ${strategy.controls.expires_in_minutes} min exceeds max of ${config.max_expires_minutes} min`
    );
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
