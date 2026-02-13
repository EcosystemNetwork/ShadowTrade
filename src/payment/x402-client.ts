import { v4 as uuidv4 } from "uuid";
import type { PaymentRecord } from "../types";

/**
 * x402 Payment Client.
 *
 * Handles the HTTP-402 pay-retry flow for paid market data tools.
 * When a tool returns 402, the agent signs a payment via the CDP wallet
 * and retries the request.
 */
export class X402PaymentClient {
  private readonly records: PaymentRecord[] = [];

  /**
   * Attempt to fetch data from a paid tool.
   *
   * If the tool returns 402, call `signPayment` and retry.
   * Logs every payment attempt.
   *
   * @param toolUrl - URL of the paid data tool
   * @param signPayment - callback that signs a payment and returns a tx hash
   * @param toolCostUsdc - cost of the tool in USDC
   */
  async fetchWithPayment(
    toolUrl: string,
    signPayment: (amount: number) => Promise<string>,
    toolCostUsdc: number
  ): Promise<unknown> {
    // First attempt — expect 402
    const firstResponse = await fetch(toolUrl);

    if (firstResponse.status === 402) {
      // Sign payment
      const txHash = await signPayment(toolCostUsdc);

      const record: PaymentRecord = {
        tool: toolUrl,
        cost_usdc: toolCostUsdc,
        tx_hash: txHash,
        timestamp: new Date().toISOString(),
        status: "success",
      };

      // Retry with payment proof
      const retryResponse = await fetch(toolUrl, {
        headers: { "X-Payment-Tx": txHash },
      });

      if (!retryResponse.ok) {
        record.status = "failed";
        this.records.push(record);
        throw new Error(
          `Paid tool retry failed: HTTP ${retryResponse.status}`
        );
      }

      this.records.push(record);
      return retryResponse.json();
    }

    if (!firstResponse.ok) {
      throw new Error(`Tool request failed: HTTP ${firstResponse.status}`);
    }

    return firstResponse.json();
  }

  /** Get all payment records. */
  getPaymentRecords(): PaymentRecord[] {
    return [...this.records];
  }

  /** Total USDC spent across all successful payments. */
  getTotalSpent(): number {
    return this.records
      .filter((r) => r.status === "success")
      .reduce((sum, r) => sum + r.cost_usdc, 0);
  }
}
