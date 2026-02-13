# Shadow Trader

**Encrypted Conditional DeFi Agent with Bring-Your-Own Claude Strategy Parsing**

Shadow Trader is an autonomous DeFi trading agent that executes conditional trades using encrypted intents, paid data discovery, and strict policy enforcement. Users may plug in their own custom Claude bots to translate natural-language strategies into a structured Strategy DSL, while the system enforces deterministic guardrails, encryption, and execution.

## Architecture

```
prompt → parse (BYO-Claude) → validate → encrypt (BITE v2) → poll → decrypt → execute → receipt
```

### Key Separation

| Layer | Responsibility |
|-------|---------------|
| **BYO-Claude Parser** | Translates natural language → Strategy DSL (untrusted) |
| **Validation Engine** | Enforces hard limits, clamps/rejects invalid values |
| **BITE v2 Encryption** | Encrypts strategy for privacy until conditions are met |
| **x402 Payment Client** | Handles HTTP 402 pay-retry flows for paid data |
| **Economic Reasoning** | Evaluates cost vs budget for tool purchases |
| **Risk Controls** | Final safety check before execution |
| **Trade Executor** | Deterministic swap execution |
| **Receipt Logger** | Immutable audit trail for every run |

## Strategy DSL

The Strategy DSL is a strict, minimal schema understood by the execution engine:

```json
{
  "pair": "ETH/USDC",
  "conditions": [
    { "type": "price_below", "value": 3000 }
  ],
  "actions": [
    { "type": "swap", "amount_usdc": 100, "direction": "buy" }
  ],
  "controls": {
    "max_slippage_bps": 50,
    "approval_mode": "auto",
    "expires_in_minutes": 60
  }
}
```

### Supported Condition Types

- `price_below` / `price_above`
- `funding_below` / `funding_above`
- `volatility_above`

### Supported Actions

- `swap`

## BYO-Claude Parser Interface

**POST** `/parse-strategy`

**Input:**
```json
{
  "user_prompt": "Buy ETH if it drops below $3000",
  "context": {
    "allowed_pairs": ["ETH/USDC"],
    "max_spend_usdc_hard": 500,
    "max_slippage_bps_hard": 75
  }
}
```

**Output:**
```json
{
  "strategy_dsl": { ... },
  "explanation": "...",
  "risk_notes": [ ... ],
  "parser_metadata": {
    "model": "claude-custom",
    "confidence": 0.78
  }
}
```

## Quick Start

```bash
npm install
npm run build
npm test
```

## Project Structure

```
src/
  schemas/        Strategy DSL Zod schemas
  parser/         BYO-Claude parser adapter
  validation/     Deterministic validation & enforcement
  encryption/     BITE v2 encrypted intent handler
  payment/        x402 payment flow client
  economic/       Economic reasoning engine
  risk/           Risk controls
  execution/      Trade executor
  receipt/        Receipt & audit trail
  workflow/       End-to-end agent workflow orchestrator
  types/          Shared TypeScript types
tests/            Test suite
```

## License

ISC
