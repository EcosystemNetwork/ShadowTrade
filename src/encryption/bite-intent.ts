import * as crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import type { StrategyDSL } from "../schemas";
import type { EncryptedIntent } from "../types";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;

/**
 * BITE v2 — encrypted conditional intent handler.
 *
 * Encrypts a validated strategy into an opaque payload.
 * Only trigger thresholds, trade size, and strategy logic are encrypted.
 * Public metadata (intent ID, budget cap, pair, expiry) remains visible.
 */
export class BiteIntentHandler {
  private readonly key: Buffer;

  constructor(encryptionKey?: Buffer) {
    this.key = encryptionKey ?? crypto.randomBytes(KEY_LENGTH);
  }

  /** Returns the encryption key (for testing / key management). */
  getKey(): Buffer {
    return this.key;
  }

  /** Encrypt a validated strategy into a BITE intent. */
  encrypt(strategy: StrategyDSL): EncryptedIntent {
    const intentId = uuidv4();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    const plaintext = JSON.stringify(strategy);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const expiresAt = new Date(
      Date.now() + strategy.controls.expires_in_minutes * 60_000
    ).toISOString();

    const totalSpend = strategy.actions.reduce(
      (sum, a) => sum + a.amount_usdc,
      0
    );

    const authorizationHash = crypto
      .createHash("sha256")
      .update(intentId + encrypted.toString("hex"))
      .digest("hex");

    return {
      intent_id: intentId,
      encrypted_payload: encrypted.toString("hex"),
      iv: iv.toString("hex"),
      auth_tag: authTag.toString("hex"),
      public_metadata: {
        intent_id: intentId,
        budget_cap_usdc: totalSpend,
        pair: strategy.pair,
        expires_at: expiresAt,
        authorization_hash: authorizationHash,
      },
      created_at: new Date().toISOString(),
    };
  }

  /** Decrypt a BITE intent back to a Strategy DSL. */
  decrypt(intent: EncryptedIntent): StrategyDSL {
    const iv = Buffer.from(intent.iv, "hex");
    const authTag = Buffer.from(intent.auth_tag, "hex");
    const encrypted = Buffer.from(intent.encrypted_payload, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as StrategyDSL;
  }
}
