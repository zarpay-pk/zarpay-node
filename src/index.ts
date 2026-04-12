/**
 * ZarPay Node.js SDK v1.0.1
 *
 * Official SDK for integrating with the ZarPay payment gateway.
 *
 * @example
 * ```ts
 * import ZarPay from 'zarpay';
 *
 * const zarpay = new ZarPay('sk_sandbox_xxxxxxxxxxxxx');
 *
 * const payment = await zarpay.payments.create({
 *   merchant_order_id: 'ORD-123',
 *   amount: 1500,
 *   channel_id: 1,
 *   customer_phone: '03001234567',
 * });
 * ```
 */

import { createHmac } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZarPayConfig {
  /** Your ZarPay API key (sk_sandbox_... or sk_production_...) */
  apiKey: string;
  /** Base URL override (defaults to https://zarpay.pk/api/v1) */
  baseUrl?: string;
  /** Request timeout in ms (default: 120000) */
  timeout?: number;
}

export interface CreatePaymentParams {
  /** Your unique order/transaction ID (max 100 chars, unique per project) */
  merchant_order_id: string;
  /** Amount in PKR (minimum 100) */
  amount: number;
  /** Channel ID from GET /channels */
  channel_id: number;
  /** Customer phone: 03XXXXXXXXX or +923XXXXXXXXX */
  customer_phone: string;
  /** Custom key-value pairs for your reference */
  metadata?: Record<string, unknown>;
  /** Idempotency key to prevent duplicate payments */
  idempotency_key?: string;
}

export interface PaymentData {
  zarpay_id: string;
  merchant_order_id: string;
  status: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_method_label: string | null;
  customer_phone: string | null;
  metadata: unknown;
  failure_reason: string | null;
  fees: {
    fee_percent: number | null;
    fee_amount: number | null;
    net_amount: number | null;
  };
  vendor_reference?: string | null;
  channel_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentResponse {
  success: boolean;
  data: PaymentData;
  idempotent?: boolean;
  failure_reason?: string;
}

export interface Channel {
  id: number;
  wallet_type: string;
}

export interface ChannelsResponse {
  success: boolean;
  data: {
    payment_methods: { type: string }[];
    channels: Channel[];
    mode: string;
  };
}

export interface CreateRefundParams {
  /** ZarPay payment ID to refund */
  zarpay_id: string;
  /** Refund amount in PKR */
  amount: number;
  /** Reason for the refund */
  reason?: string;
}

export interface RefundData {
  refund_id: number;
  status: string;
  amount: number;
  reason: string | null;
}

export interface RefundResponse {
  success: boolean;
  data: RefundData;
}

export interface BalanceData {
  total_completed: number;
  total_fees: number;
  total_refunds: number;
  settled: number;
  unsettled: number;
  pending: number;
  withdrawn: number;
  available: number;
  currency: string;
}

export interface BalanceResponse {
  success: boolean;
  data: BalanceData;
}

export interface SettlementData {
  id: number;
  period_start: string;
  period_end: string;
  gross_amount: number;
  total_fees: number;
  total_refunds: number;
  net_amount: number;
  transaction_count: number;
  status: string;
  settled_at: string | null;
  created_at: string;
}

export interface SettlementsResponse {
  success: boolean;
  data: {
    total: number;
    page: number;
    limit: number;
    settlements: SettlementData[];
  };
}

export interface ZarPayError {
  success: false;
  error: string;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    delivery_id: number;
    zarpay_id: string;
    merchant_order_id: string;
    status: string;
    amount: number;
    currency: string;
    channel_id: number | null;
    customer_phone: string | null;
    metadata: unknown;
    failure_reason: string | null;
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ZarPayAPIError extends Error {
  public readonly status: number;
  public readonly body: ZarPayError;

  constructor(status: number, body: ZarPayError) {
    super(body.error || `ZarPay API error (HTTP ${status})`);
    this.name = "ZarPayAPIError";
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://zarpay.pk/api/v1";
const DEFAULT_TIMEOUT = 120_000;
const SDK_VERSION = "1.0.1";

class PaymentsResource {
  constructor(private client: ZarPay) {}

  /** Create a new payment */
  async create(params: CreatePaymentParams): Promise<PaymentResponse> {
    return this.client._request<PaymentResponse>("POST", "/payments", params);
  }

  /** Get payment by ZarPay ID */
  async get(zarpayId: string): Promise<PaymentResponse> {
    return this.client._request<PaymentResponse>(
      "GET",
      `/payments/${encodeURIComponent(zarpayId)}`
    );
  }

  /** Get payment by your merchant order ID */
  async getByOrderId(orderId: string): Promise<PaymentResponse> {
    return this.client._request<PaymentResponse>(
      "GET",
      `/payments/by-order/${encodeURIComponent(orderId)}`
    );
  }
}

class RefundsResource {
  constructor(private client: ZarPay) {}

  /** Initiate a refund on a completed payment */
  async create(params: CreateRefundParams): Promise<RefundResponse> {
    return this.client._request<RefundResponse>("POST", "/refunds", params);
  }
}

class BalanceResource {
  constructor(private client: ZarPay) {}

  /** Get the project's financial balance summary */
  async get(): Promise<BalanceResponse> {
    return this.client._request<BalanceResponse>("GET", "/balance");
  }
}

class SettlementsResource {
  constructor(private client: ZarPay) {}

  /** List settlements for the project */
  async list(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<SettlementsResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return this.client._request<SettlementsResponse>(
      "GET",
      `/settlements${qs ? `?${qs}` : ""}`
    );
  }
}

class ChannelsResource {
  constructor(private client: ZarPay) {}

  /** List available payment channels */
  async list(): Promise<ChannelsResponse> {
    return this.client._request<ChannelsResponse>("GET", "/channels");
  }
}

export default class ZarPay {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  /** Payment operations */
  public payments: PaymentsResource;
  /** Refund operations */
  public refunds: RefundsResource;
  /** Balance queries */
  public balance: BalanceResource;
  /** Settlement queries */
  public settlements: SettlementsResource;
  /** Channel operations */
  public channels: ChannelsResource;

  /**
   * Create a new ZarPay client.
   *
   * @param apiKey - Your ZarPay API key
   * @param config - Optional configuration overrides
   */
  constructor(apiKey: string, config?: Partial<Omit<ZarPayConfig, "apiKey">>) {
    if (!apiKey) {
      throw new Error("ZarPay API key is required");
    }

    this.apiKey = apiKey;
    this.baseUrl = (config?.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = config?.timeout || DEFAULT_TIMEOUT;

    this.payments = new PaymentsResource(this);
    this.refunds = new RefundsResource(this);
    this.balance = new BalanceResource(this);
    this.settlements = new SettlementsResource(this);
    this.channels = new ChannelsResource(this);
  }

  /** @internal */
  async _request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "User-Agent": `zarpay-node/${SDK_VERSION}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });

      const data = (await response.json()) as Record<string, unknown>;

      if (!response.ok && data.error) {
        throw new ZarPayAPIError(response.status, data as unknown as ZarPayError);
      }

      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  // -----------------------------------------------------------------------
  // Webhook verification
  // -----------------------------------------------------------------------

  /**
   * Verify a webhook signature.
   *
   * @param rawBody - The raw request body string
   * @param signatureHeader - The X-ZarPay-Signature header value
   * @param secret - Your webhook signing secret (whsec_...)
   * @param toleranceSec - Max age in seconds (default: 300 = 5 minutes)
   * @returns The parsed webhook payload
   * @throws Error if signature is invalid or timestamp is too old
   */
  static verifyWebhook(
    rawBody: string,
    signatureHeader: string,
    secret: string,
    toleranceSec = 300
  ): WebhookPayload {
    const parts: Record<string, string> = {};
    for (const part of signatureHeader.split(",")) {
      const idx = part.indexOf("=");
      if (idx > 0) {
        parts[part.slice(0, idx)] = part.slice(idx + 1);
      }
    }

    const { t, v1 } = parts;
    if (!t || !v1) {
      throw new Error("Invalid X-ZarPay-Signature header format");
    }

    const timestamp = Number(t);
    if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) {
      throw new Error("Webhook timestamp too old — possible replay attack");
    }

    const expected = createHmac("sha256", secret)
      .update(`${t}.${rawBody}`)
      .digest("hex");

    if (expected !== v1) {
      throw new Error("Invalid webhook signature");
    }

    return JSON.parse(rawBody) as WebhookPayload;
  }
}

// Named exports for convenience
export { ZarPay };
