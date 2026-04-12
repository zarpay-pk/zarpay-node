# ZarPay Node.js SDK

Official Node.js/TypeScript SDK for the [ZarPay](https://zarpay.pk) payment gateway.

## Installation

```bash
npm install zarpay
```

## Quick Start

```typescript
import ZarPay from 'zarpay';

const zarpay = new ZarPay('sk_sandbox_xxxxxxxxxxxxx');

const payment = await zarpay.payments.create({
  merchant_order_id: 'ORD-123',
  amount: 1500,
  channel_id: 1,
  customer_phone: '03001234567',
});

console.log(payment.data.status);
```

## Payments

```typescript
// Create a payment
const payment = await zarpay.payments.create({
  merchant_order_id: 'ORD-456',
  amount: 2500,
  channel_id: 1,
  customer_phone: '03001234567',
  metadata: { customer_name: 'Ahmed Khan' },
  idempotency_key: 'unique-key-456',
});

// Get by ZarPay ID
const payment = await zarpay.payments.get('ZP_abc123def456');

// Get by your order ID
const payment = await zarpay.payments.getByOrderId('ORD-456');
```

## Refunds

```typescript
const refund = await zarpay.refunds.create({
  zarpay_id: 'ZP_abc123def456',
  amount: 500,
  reason: 'Customer requested refund',
});

console.log(refund.data.status); // 'pending' — requires admin approval
```

## Balance

```typescript
const balance = await zarpay.balance.get();

console.log('Available:', balance.data.available);
console.log('Settled:', balance.data.settled);
console.log('Unsettled:', balance.data.unsettled);
console.log('Pending:', balance.data.pending);
```

## Settlements

```typescript
const settlements = await zarpay.settlements.list({
  status: 'PAID',
  page: 1,
  limit: 10,
});

for (const s of settlements.data.settlements) {
  console.log(`#${s.id}: PKR ${s.net_amount} (${s.status})`);
}
```

## Channels

```typescript
const channels = await zarpay.channels.list();

for (const ch of channels.data.channels) {
  console.log(`${ch.id}: ${ch.wallet_type}`);
}
```

## Verify Webhooks

```typescript
import { ZarPay } from 'zarpay';

app.post('/webhooks/zarpay', (req, res) => {
  try {
    const event = ZarPay.verifyWebhook(
      req.body,
      req.headers['x-zarpay-signature'],
      'whsec_your_webhook_secret'
    );

    switch (event.event) {
      case 'payment.completed':
        break;
      case 'refund.completed':
        break;
      case 'settlement.paid':
        break;
    }

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(400);
  }
});
```

## Error Handling

```typescript
import ZarPay, { ZarPayAPIError } from 'zarpay';

try {
  await zarpay.payments.create({ ... });
} catch (err) {
  if (err instanceof ZarPayAPIError) {
    console.log(err.status);  // 400, 401, 409, etc.
    console.log(err.message); // Human-readable error
  }
}
```

## Configuration

```typescript
const zarpay = new ZarPay('sk_sandbox_xxx', {
  baseUrl: 'http://localhost:3550/api/v1',
  timeout: 60000,
});
```

## API Reference

| Resource | Method | Endpoint |
|----------|--------|----------|
| `payments.create()` | POST | /payments |
| `payments.get()` | GET | /payments/:id |
| `payments.getByOrderId()` | GET | /payments/by-order/:id |
| `refunds.create()` | POST | /refunds |
| `balance.get()` | GET | /balance |
| `settlements.list()` | GET | /settlements |
| `channels.list()` | GET | /channels |
| `ZarPay.verifyWebhook()` | — | Verify webhook signature |

## License

MIT
