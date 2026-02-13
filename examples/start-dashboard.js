#!/usr/bin/env node

/**
 * Start the Shadow Trader Dashboard server.
 * 
 * This script launches an HTTP server that provides:
 * - A web dashboard for managing claw bots and submitting trades
 * - REST API for bot management and trade execution
 * - Real-time trade monitoring
 * 
 * Usage:
 *   npm run dashboard
 *   node examples/start-dashboard.js
 */

const { DashboardServer } = require("../dist");

const dashboardConfig = {
  // Parser endpoint (will be overridden by bot configurations)
  parser_endpoint: "http://localhost:3000/parse-strategy",
  parser_timeout_ms: 10000,
  
  // Hard limits
  allowed_pairs: ["ETH/USDC", "BTC/USDC", "SOL/USDC"],
  max_spend_usdc_hard: 1000,
  max_slippage_bps_hard: 100,
  
  // Budget
  budget_usdc: 10000,
  
  // Condition checking
  condition_check_interval_ms: 5000,
  max_monitoring_duration_ms: 3600000, // 1 hour
};

const serverConfig = {
  port: 8080,
  host: "127.0.0.1",  // Localhost only for development
};

async function main() {
  console.log("🚀 Starting Shadow Trader Dashboard...");
  console.log("");
  console.log("Configuration:");
  console.log(`  - Allowed pairs: ${dashboardConfig.allowed_pairs.join(", ")}`);
  console.log(`  - Max spend per trade: $${dashboardConfig.max_spend_usdc_hard} USDC`);
  console.log(`  - Max slippage: ${dashboardConfig.max_slippage_bps_hard} bps`);
  console.log(`  - Total budget: $${dashboardConfig.budget_usdc} USDC`);
  console.log("");
  
  const server = new DashboardServer(dashboardConfig, serverConfig);
  
  await server.start();
  
  console.log("");
  console.log("✓ Dashboard is running!");
  console.log("");
  console.log(`  Dashboard UI: http://localhost:${serverConfig.port}/dashboard`);
  console.log(`  API Base:     http://localhost:${serverConfig.port}/api`);
  console.log("");
  console.log("API Endpoints:");
  console.log("  GET    /api/bots              - List all registered bots");
  console.log("  POST   /api/bots              - Register a new bot");
  console.log("  GET    /api/bots/:name/health - Check bot health");
  console.log("  GET    /api/trades            - List all trades");
  console.log("  POST   /api/trades            - Submit a new trade");
  console.log("  GET    /api/trades/:id        - Get trade status");
  console.log("  DELETE /api/trades/:id        - Cancel a trade");
  console.log("");
  console.log("Press Ctrl+C to stop");
  
  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n\n⏸️  Shutting down dashboard...");
    await server.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Failed to start dashboard:", err);
  process.exit(1);
});
