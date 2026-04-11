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

// Create a payment
const payment = await zarpay.payments.create({
  merchant_order_id: 'ORD-123',
  amount: 1500,
  channel_id: 1,
  customer_phone: '03001234567',
});

console.log(payment.data.status); // 'completed' | 'processing' | 'failed'
```

## Usage

### List Available Channels

```typescript
const channels = await zarpay.channels.list();

for (const ch of channels.data.channels) {
  console.log(`${ch.id}: ${ch.wallet_type}`);
}
```

### Create a Payment

```typescript
const payment = await zarpay.payments.create({
  merchant_order_id: 'ORD-456',
  amount: 2500,
  channel_id: 1,
  customer_phone: '03001234567',
  metadata: { customer_name: 'Ahmed Khan' },
  idempotency_key: 'unique-key-456',
});

if (payment.success) {
  console.log('Payment completed:', payment.data.zarpay_id);
} else {
  console.log('Payment failed:', payment.data.failure_reason);
}
```

### Get Payment Status

```typescript
// By ZarPay ID
const payment = await zarpay.payments.get('ZP_abc123def456');

// By your order ID
const payment = await zarpay.payments.getByOrderId('ORD-456');
```

### Verify Webhooks

```typescript
import { ZarPay } from 'zarpay';

// In your webhook handler (e.g. Express)
app.post('/webhooks/zarpay', (req, res) => {
  try {
    const event = ZarPay.verifyWebhook(
      req.body,                              // raw body string
      req.headers['x-zarpay-signature'],     // signature header
      'whsec_your_webhook_secret'            // from project settings
    );

    switch (event.event) {
      case 'payment.completed':
        // Fulfill the order
        break;
      case 'payment.failed':
        // Notify customer
        break;
    }

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(400);
  }
});
```

### Error Handling

```typescript
import ZarPay, { ZarPayAPIError } from 'zarpay';

try {
  const payment = await zarpay.payments.create({ ... });
} catch (err) {
  if (err instanceof ZarPayAPIError) {
    console.log(err.status);    // HTTP status code (400, 401, 409, etc.)
    console.log(err.message);   // Human-readable error
  }
}
```

### Configuration

```typescript
const zarpay = new ZarPay('sk_sandbox_xxx', {
  baseUrl: 'http://localhost:3000/api/v1',  // for local development
  timeout: 60000,                            // request timeout in ms
});
```

## License

MIT
