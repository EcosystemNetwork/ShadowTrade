import * as http from "http";
import * as url from "url";
import * as fs from "fs";
import * as path from "path";
import { TradingDashboard } from "./trading-dashboard";
import type { DashboardConfig } from "./trading-dashboard";
import type { BotConfig } from "./bot-manager";

export interface ServerConfig {
  port: number;
  host?: string;
  corsOrigin?: string;
}

/**
 * HTTP server for the trading dashboard.
 */
export class DashboardServer {
  private readonly dashboard: TradingDashboard;
  private readonly config: ServerConfig;
  private server?: http.Server;

  constructor(dashboardConfig: DashboardConfig, serverConfig: ServerConfig) {
    this.dashboard = new TradingDashboard(dashboardConfig);
    this.config = serverConfig;
  }

  /**
   * Start the dashboard server.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      const host = this.config.host ?? "0.0.0.0";
      
      this.server.listen(this.config.port, host, () => {
        console.log(`Dashboard server running at http://${host}:${this.config.port}`);
        resolve();
      });

      this.server.on("error", (err) => {
        reject(err);
      });
    });
  }

  /**
   * Stop the dashboard server.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("Dashboard server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP requests.
   */
  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const parsedUrl = url.parse(req.url ?? "", true);
    const pathname = parsedUrl.pathname ?? "/";

    // Set CORS headers
    const corsOrigin = this.config.corsOrigin ?? "*";
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      // API Routes
      if (pathname.startsWith("/api/")) {
        await this.handleApiRequest(pathname, req, res);
        return;
      }

      // Serve static files
      if (pathname === "/" || pathname === "/dashboard") {
        this.serveFile(res, "dashboard.html", "text/html");
        return;
      }

      if (pathname === "/favicon.ico") {
        this.serveFile(res, "favicon.ico", "image/x-icon");
        return;
      }

      // 404
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    } catch (err: unknown) {
      console.error("Request error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  /**
   * Handle API requests.
   */
  private async handleApiRequest(
    pathname: string,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    // GET /api/bots - List all bots
    if (pathname === "/api/bots" && req.method === "GET") {
      const bots = this.dashboard.listBots();
      this.sendJson(res, 200, bots);
      return;
    }

    // POST /api/bots - Register a new bot
    if (pathname === "/api/bots" && req.method === "POST") {
      const body = await this.readBody(req);
      const botConfig = JSON.parse(body) as BotConfig;
      this.dashboard.registerBot(botConfig);
      this.sendJson(res, 201, { message: "Bot registered successfully" });
      return;
    }

    // GET /api/bots/:name/health - Check bot health
    if (pathname.startsWith("/api/bots/") && pathname.endsWith("/health") && req.method === "GET") {
      const botName = decodeURIComponent(pathname.split("/")[3]);
      const health = await this.dashboard.checkBotHealth(botName);
      this.sendJson(res, 200, health);
      return;
    }

    // GET /api/trades - List all trades
    if (pathname === "/api/trades" && req.method === "GET") {
      const trades = this.dashboard.listTrades();
      this.sendJson(res, 200, trades);
      return;
    }

    // POST /api/trades - Submit a new trade
    if (pathname === "/api/trades" && req.method === "POST") {
      const body = await this.readBody(req);
      const { user_prompt, bot_name } = JSON.parse(body);
      const trade = await this.dashboard.submitTrade(user_prompt, bot_name);
      this.sendJson(res, 201, trade);
      return;
    }

    // GET /api/trades/:id - Get trade status
    if (pathname.startsWith("/api/trades/") && req.method === "GET") {
      const tradeId = decodeURIComponent(pathname.split("/")[3]);
      const trade = this.dashboard.getTradeStatus(tradeId);
      if (trade) {
        this.sendJson(res, 200, trade);
      } else {
        this.sendJson(res, 404, { error: "Trade not found" });
      }
      return;
    }

    // DELETE /api/trades/:id - Cancel a trade
    if (pathname.startsWith("/api/trades/") && req.method === "DELETE") {
      const tradeId = decodeURIComponent(pathname.split("/")[3]);
      const cancelled = this.dashboard.cancelTrade(tradeId);
      if (cancelled) {
        this.sendJson(res, 200, { message: "Trade cancelled" });
      } else {
        this.sendJson(res, 404, { error: "Trade not found or cannot be cancelled" });
      }
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "API endpoint not found" }));
  }

  /**
   * Serve a static file from the public directory.
   */
  private serveFile(res: http.ServerResponse, filename: string, contentType: string): void {
    const filePath = path.join(__dirname, "..", "..", "public", filename);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
    }
  }

  /**
   * Send JSON response.
   */
  private sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  /**
   * Read request body.
   */
  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        resolve(body);
      });
      req.on("error", (err) => {
        reject(err);
      });
    });
  }
}
