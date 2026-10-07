Frontend → http Gateway → Payment Service (initiate-payment)
            ↓
        Paystack UI
            ↓
        Paystack Webhook → /paystack/webhook
            ↓
      Payment DB Updated
            ↓
      Emit create_bet → Lottery Microservice → Bet Saved

# Lottery Microservice Flow

- User makes payment by submitting a payment request to the payment service.
  sending data like:
  ```json
    {
        "amount": 50,
        "email": "GK8Xg@example.com",
        "fullname": "Callie Erickson"
    }
  ```

```
