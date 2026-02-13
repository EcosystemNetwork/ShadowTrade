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

## Trading Dashboard

Shadow Trader includes a web-based dashboard for managing claw bots and executing real trades.

### Starting the Dashboard

```bash
npm run dashboard
```

This starts an HTTP server at `http://localhost:8080` with:
- **Dashboard UI**: `http://localhost:8080/dashboard`
- **REST API**: `http://localhost:8080/api`

### Using the Dashboard

1. **Add a Claw Bot**
   - Click "Add New Bot" in the dashboard
   - Enter your bot's name and parser endpoint URL
   - Optionally add an API key for authentication
   - Enable the bot to make it available for trading

2. **Submit a Trade**
   - Select a registered bot from the dropdown
   - Enter your trading strategy in natural language
   - Click "Submit Trade" to start monitoring

3. **Monitor Trades**
   - View active trades in real-time
   - Check trade status (pending, monitoring, executed, failed, expired)
   - View detailed trade information including receipts

### Dashboard API

The dashboard exposes a REST API for programmatic access:

**Bot Management**
- `GET /api/bots` - List all registered bots
- `POST /api/bots` - Register a new bot
- `GET /api/bots/:name/health` - Check bot health

**Trade Management**
- `GET /api/trades` - List all trades
- `POST /api/trades` - Submit a new trade
- `GET /api/trades/:id` - Get trade status
- `DELETE /api/trades/:id` - Cancel a trade

**Example: Register a Bot**
```bash
curl -X POST http://localhost:8080/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-claude-bot",
    "endpoint": "https://your-bot.example.com/parse-strategy",
    "enabled": true
  }'
```

**Example: Submit a Trade**
```bash
curl -X POST http://localhost:8080/api/trades \
  -H "Content-Type: application/json" \
  -d '{
    "bot_name": "my-claude-bot",
    "user_prompt": "Buy ETH if it drops below $2800, max spend $200"
  }'
```

### Configuration

You can customize the dashboard configuration in `examples/start-dashboard.js`:

```javascript
const dashboardConfig = {
  // Allowed trading pairs
  allowed_pairs: ["ETH/USDC", "BTC/USDC", "SOL/USDC"],
  
  // Maximum spend per trade (hard limit)
  max_spend_usdc_hard: 1000,
  
  // Maximum slippage in basis points (hard limit)
  max_slippage_bps_hard: 100,
  
  // Total trading budget
  budget_usdc: 10000,
  
  // Condition check interval (milliseconds)
  condition_check_interval_ms: 5000,
  
  // Maximum monitoring duration (milliseconds)
  max_monitoring_duration_ms: 3600000, // 1 hour
};
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
  dashboard/      Trading dashboard & bot manager
  types/          Shared TypeScript types
tests/            Test suite
examples/         Example scripts and usage demos
public/           Static assets (HTML, favicon)
```

## License

ISC
