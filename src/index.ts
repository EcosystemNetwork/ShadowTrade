// Shadow Trader — Encrypted Conditional DeFi Agent
// with Bring-Your-Own Claude Strategy Parsing

// Schemas
export {
  StrategyDSLSchema,
  ConditionTypeEnum,
  ActionTypeEnum,
  ControlsSchema,
  ConditionSchema,
  ActionSchema,
} from "./schemas";
export type {
  StrategyDSL,
  ConditionType,
  Condition,
  Action,
  Controls,
} from "./schemas";

// Parser
export { ParserAdapter } from "./parser";
export type {
  ParserConfig,
  ParserInput,
  ParserOutput,
  ParserContext,
  ParserMetadata,
} from "./parser";

// Validation
export { validateStrategy } from "./validation";
export type { ValidationLimits, ValidationResult } from "./validation";

// Encryption
export { BiteIntentHandler } from "./encryption";

// Payment
export { X402PaymentClient } from "./payment";

// Economic Reasoning
export { EconomicReasoningEngine } from "./economic";

// Risk Controls
export { checkRisk } from "./risk";
export type { RiskConfig, RiskCheckResult } from "./risk";

// Execution
export { TradeExecutor } from "./execution";
export type { ExecutionResult } from "./execution";

// Receipt
export { ReceiptLogger } from "./receipt";

// Workflow
export { AgentWorkflow } from "./workflow";
export type { ConditionChecker, WorkflowResult } from "./workflow";

// Types
export type {
  EncryptedIntent,
  PaymentRecord,
  ReasonCode,
  ExecutionReceipt,
  WorkflowConfig,
} from "./types";

// Dashboard
export { BotManager, TradingDashboard, DashboardServer } from "./dashboard";
export type {
  BotConfig,
  BotHealthStatus,
  TradeRequest,
  DashboardConfig,
  ServerConfig,
} from "./dashboard";
