# Shadow Trader Product Specification

## 1. Executive Summary

Shadow Trader is an autonomous, encrypted DeFi trading agent that allows users to bring their own Claude-based AI agents to parse natural-language trading strategies into a strict, deterministic Strategy DSL.

The system enforces hard guardrails, encrypted execution, paid data procurement (x402), and auditable receipts, ensuring that even highly customized or uniquely trained Claude bots cannot violate safety, budget, or policy constraints.

The product demonstrates a complete agentic commerce workflow:

`intent → parsing → validation → encryption → discovery → paid data → conditional execution → receipt`

## 2. Problem Statement

Current AI trading agents suffer from:

- Strategy leakage (front-running risk)
- Over-trust in LLM reasoning
- Lack of budget enforcement
- No standardized authorization lifecycle
- No clear audit trail
- Inflexibility across different AI agents/models

At the same time, advanced users increasingly customize their own Claude bots with unique training, prompts, and behaviors — but these bots cannot be trusted to execute trades directly.

## 3. Product Vision

Enable model-agnostic, encrypted, conditional trading agents where:

- Users bring their own Claude bot (any variant, training, or deployment)
- Claude assists with interpretation and explanation
- A deterministic engine enforces policy
- Sensitive strategy logic remains private until execution
- Every paid action is logged, receipted, and auditable

Shadow Trader becomes a reference architecture for safe, agent-assisted capital deployment.

## 4. Goals

### Primary Goals

- Support Bring-Your-Own Claude bots via a strict parsing interface
- Demonstrate encrypted conditional execution (BITE v2)
- Use repeated x402 paid tool calls
- Enforce AP2 intent → authorization → settlement
- Produce complete audit receipts

### Secondary Goals

- Enable economic reasoning (budget awareness)
- Provide clear human-readable explanations
- Offer reusable agent patterns for other builders

## 5. Non-Goals

- Letting LLMs directly execute trades
- High-frequency trading
- Unbounded leverage
- Model training or fine-tuning
- Institutional custody features

## 6. User Personas

### 6.1 Advanced DeFi Trader

Uses a customized Claude bot to express complex strategies but wants execution safety.

### 6.2 Security-Conscious User

Wants encrypted thresholds and guardrails to prevent leakage.

### 6.3 Agent Builder / Developer

Wants a reusable pattern for safe LLM-assisted agents.

## 7. Core Concept: BYO-Claude Strategy Parsing

### Principle

LLMs interpret. Engines enforce.

Claude bots assist with understanding, never execution.

## 8. Core Features

### 8.1 Bring-Your-Own Claude Strategy Parser

#### Description

Users provide a Claude bot endpoint (local or hosted) that converts natural language into a strict Strategy DSL.

Each Claude bot may be uniquely trained, prompted, or customized.

#### Claude Responsibilities

- Parse user intent into Strategy DSL JSON
- Generate a human-readable explanation
- Produce risk notes and warnings
- Suggest (but not enforce) defaults

#### Claude Is Explicitly NOT Allowed To

- Trigger trades
- Override spend caps
- Call tools
- Modify allowlists
- Bypass validation

### 8.2 Strategy Parser Interface (Contract)

#### Input

- Natural-language strategy prompt
- Contextual constraints (budget, allowlists)

#### Output

- `strategy_dsl`
- `explanation`
- `risk_notes`
- `parser_metadata`

The system treats Claude output as untrusted input.

### 8.3 Deterministic Validation Engine

After receiving Claude output, the engine:

#### Enforces Hard Constraints

- Spend ≤ hard budget cap
- Slippage ≤ max allowed
- Token pair allowlist
- Condition enum allowlist
- Mandatory expiration
- No leverage unless enabled

#### Behavior

- Clamp values if needed
- Reject invalid strategies
- Fail closed with clear errors

Only the validated strategy proceeds.

### 8.4 Encrypted Conditional Intent (BITE v2)

#### Encrypted Fields

- Price thresholds
- Funding thresholds
- Trade size
- Strategy logic

#### Public Fields

- Intent ID
- Budget cap
- Allowed pair
- Expiration
- Authorization signature

#### Workflow

- Validated strategy encrypted
- Encrypted intent stored
- Decrypt only when conditions met

This prevents front-running and strategy leakage.

### 8.5 Paid Market Data Discovery (x402)

The agent autonomously procures market data using paid APIs:

- Price oracle
- Funding rate API
- Optional volatility feed

#### Requirements

- Each tool returns HTTP 402
- Agent pays via CDP Wallet
- Request retried after payment
- Payment logged
- At least two paid tool calls per workflow

### 8.6 Economic Reasoning Layer

Agent evaluates:

- Remaining budget
- Tool cost
- Signal value

Example:

> “Volatility feed costs $1.50. Remaining budget $2. Skip.”

All decisions logged with reason codes.

### 8.7 Risk Controls

Mandatory safeguards:

- Hard spend cap
- Slippage bounds
- Token allowlist
- Time-based expiry
- Polling timeout
- Optional human confirmation mode

Any violation aborts execution.

### 8.8 Trade Execution Engine

When all conditions are met:

- Decrypt strategy
- Re-validate against policy
- Execute swap (real or simulated)
- Log transaction hash
- Generate receipt

Execution must be deterministic and replayable.

### 8.9 AP2 Intent Lifecycle

Clear separation of:

- Intent Creation (user authorization)
- Execution Authorization (policy validation)
- Settlement (trade execution)
- Receipt Generation

Each stage is logged independently.

### 8.10 Receipts & Audit Trail

Each run produces:

- Raw user prompt
- Claude parser output
- Validated strategy
- x402 payment logs
- Execution receipt

#### Receipt Includes

- Intent ID
- Paid tools + tx hashes
- Condition evaluation
- Trade execution hash
- Total spend
- Reason codes

## 9. End-to-End Workflow

1. User enters strategy prompt
2. Claude parser converts to DSL
3. Engine validates + clamps
4. Strategy encrypted (BITE)
5. Agent polls data (x402)
6. Conditions satisfied
7. Strategy decrypted
8. Trade executed
9. Receipt generated

## 10. Technical Architecture

### Frontend

- Next.js
- Strategy input
- Claude endpoint config
- Validation preview
- Agent activity dashboard

### Backend

- Node.js agent orchestrator
- Strategy validator
- BITE encryption handler
- x402 payment middleware
- CDP wallet signer
- Receipt logger

## 11. Data Models

### StrategyIntent

- `intent_id`
- `encrypted_payload`
- `budget_cap`
- `allowlist`
- `expiration`
- `authorization_signature`

### PaymentRecord

- `tool_name`
- `cost`
- `tx_hash`
- `timestamp`

### ExecutionReceipt

- `conditions_met`
- `trade_tx`
- `spend_summary`
- `reason_codes`

## 12. Security Considerations

- Claude endpoints sandboxed
- Timeouts + size limits
- JSON schema validation
- No raw private keys
- Encryption before polling
- Fail-closed logic everywhere

## 13. Failure Modes

| Scenario | Behavior |
|---|---|
| Claude output invalid | Reject |
| Budget exceeded | Abort |
| Partial conditions | Continue polling |
| Tool failure | Retry then abort |
| Decrypt failure | Abort |
| Swap failure | Log + halt |

## 14. Demo Requirements

Demo must show:

- BYO Claude endpoint in use
- Parsed DSL + validation
- Encrypted intent
- HTTP 402 payment
- CDP wallet signing
- Conditional trigger
- Trade execution
- Receipt output

## 15. Success Metrics

- ≥ 2 x402 payments per run
- 100% policy enforcement
- Encrypted strategy lifecycle demonstrated
- Full audit receipt generated
- Clear separation of Claude vs engine responsibility

## 16. Why This Wins

Shadow Trader demonstrates:

- Model-agnostic agent design
- Encrypted conditional execution
- Real economic reasoning
- Deterministic safety
- Composable agent architecture

It proves that agents can be powerful without being reckless.

## 17. Future Extensions

- Multi-agent strategy voting
- Portfolio-level policies
- DAO-controlled Claude parsers
- SLA-based conditional automation
- Cross-chain encrypted execution
