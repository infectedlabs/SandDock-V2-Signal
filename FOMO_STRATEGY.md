# Sanddock FOMO Strategy: Application-Based Access Model

## Overview

This is a **legitimate exclusivity model** that replaces traditional SaaS pricing with an application-based access gate. Instead of self-serve checkouts, users apply for access, the team reviews them, and access is granted based on their risk management approach.

## Why This Works for Sanddock

1. **Immediate positioning**: The moment someone lands on `/pricing` and sees "Application Required" instead of a price, it signals Sanddock is different from every other signal tool.
2. **Pre-qualification**: You learn about users before they join, allowing you to onboard the right people.
3. **Genuine FOMO**: People waiting for Tuesday review and hearing back Wednesday create organic word-of-mouth better than countdown timers.
4. **Higher activation**: Someone who applied, waited, and was accepted uses the product more seriously than someone who just clicked "Subscribe."

## Implementation Checklist

### Frontend (✅ Complete)
- [x] `/pricing` page - features only, no prices, "Apply for access" buttons
- [x] `/apply` page - complete application form with all fields
- [x] Application stats display - shows live access status

### Backend (✅ Complete)
- [x] `/api/applications` POST endpoint - accepts and stores applications
- [x] `/api/applications/stats` GET endpoint - returns application counts
- [x] `/api/admin/applications` GET endpoint - admin dashboard data
- [x] `/api/admin/applications/[id]` PATCH endpoint - update application status

### Database (✅ Complete)
- [x] `applications` table - stores all application data with RLS policies
- [x] Status tracking (pending, accepted, waitlisted, rejected)
- [x] Admin dashboard page at `/admin/applications`

### Operational (TODO)
- [ ] Set up email notifications (application received, accepted/rejected)
- [ ] Set up USDT TRC-20 wallet for payments
- [ ] Create payment confirmation workflow
- [ ] Set up Tuesday review cadence
- [ ] Train team on application review process

## The Application Form

The form collects intentional information:

**Section 1: About You**
- Name, email, country
- Telegram (optional but signals seriousness)

**Section 2: About Your Trading**
- Experience level (under 6 months / 6–24 months / 2+ years)
- Capital range (under $1k / $1k–10k / $10k–50k / $50k+)
- Exchanges used
- Current signal services (if any)

**Section 3: About What You Want**
- Which plan (Pro or Master)
- Goal (2–3 sentences)
- How they found us

**Section 4: The Filter Question** ⭐️
- "What is your risk management approach per trade?"

That last question is **the real filter**. You'll know within seconds if someone is a good fit:
- ❌ Bad: "I risk 10% per trade, I just need to know when to buy"
- ✅ Good: "I typically risk 1–2% per trade with a pre-set stop loss, sized based on distance to stop"

## Review Process

### Tuesday Review Cycle

Every Tuesday at 00:00 UTC:
1. Batch all pending applications
2. Review each application (focus on risk management answer)
3. Make accept/waitlist/reject decisions
4. Update statuses in the admin dashboard
5. Send automated emails by Wednesday morning

### Admin Dashboard

At `/admin/applications`:
- Filter by status (pending, accepted, waitlisted, rejected)
- View full application details including the critical risk management answer
- Approve, waitlist, or reject with reviewer notes
- All changes tracked automatically

## Payment Flow (Manual → Automated)

### Current (Manual) - Scale 1-50 Users
1. Accept application via admin dashboard
2. Send email: "Congratulations! Here's how to pay:"
   - Amount: e.g., $29/month or $19/month (yearly)
   - Wallet: `USDT_TRC20_ADDRESS`
   - Ref code: `APP_ID_USER_EMAIL` (for tracking)
3. User sends USDT to wallet
4. You receive email notification from blockchain
5. Manually activate account in database:
   ```sql
   UPDATE auth.users 
   SET user_metadata = jsonb_set(user_metadata, '{plan}', '"pro"')
   WHERE id = 'USER_ID';
   ```
6. Send welcome email with Telegram invite
7. Log transaction in spreadsheet (name, email, USDT hash, date)

### Future (Automated) - Scale 50+ Users
Use **BTCPayServer** (self-hosted, zero fees):
1. Create invoice automatically when application approved
2. User pays → system confirms on-chain
3. Webhook triggers account activation automatically
4. No manual steps after approval

## Pricing (Set After Seeing Demand)

**Current proposal** (adjust based on applications):

| Plan | Monthly | Yearly | Crypto (USDT) |
|------|---------|--------|---------------|
| Free | Free | Free | Free |
| Pro | $29 | $228/yr ($19/mo) | Equivalent USDT |
| Master | $79 | $588/yr ($49/mo) | Equivalent USDT |

**Do not announce prices on the website.** Prices are sent individually after acceptance via email.

## Crypto Payment Setup

### Wallet Configuration
1. Create a Tron Network wallet (TRC-20)
   - Use a hardware wallet or multi-sig for security
   - Or dedicated exchange account
2. Store address in environment: `NEXT_PUBLIC_USDT_WALLET`
3. Add to payment emails: "Send **exactly** X USDT to this address with ref code in memo"

### Why TRC-20?
- Transaction fees: fractions of a cent
- Confirmation time: 1-2 minutes
- USDT is pegged 1:1 to USD (no price slippage risk)
- All serious crypto traders already have it

### Stablecoin Only
- ✅ Accept: USDT (TRC-20 or Ethereum), USDC, DAI
- ❌ Reject: BTC, ETH, SOL (volatile, accounting nightmare)

## Tracking & Compliance

### Spreadsheet Log
Keep a simple Google Sheet for every payment received:

| User | Email | Plan | Amount USDT | USD Value | TxHash | Date Received | Start Date | End Date |
|------|-------|------|------------|-----------|--------|---------------|-----------|----------|
| Alex | alex@... | Pro | 29 | $29 | 0x1234... | 2024-07-20 | 2024-07-20 | 2024-08-20 |

**Key**: The TxHash is your receipt - it's on-chain and permanently verifiable.

### Tax Reporting
- USDT is pegged to $1, so 1 USDT = $1 for tax purposes
- Record each payment at its USD equivalent at time of receipt
- This is straightforward income reporting (unlike BTC/ETH fluctuations)

## Access Status Display

On `/pricing`, show live counts:

```
CURRENT ACCESS STATUS

Pro plan:     OPEN - reviewing applications
Master plan:  WAITLIST - 47 on waitlist
Grandmaster:  CLOSED - next opening unannounced

Applications reviewed:  Every Tuesday
Last batch:             12 accepted, 3 waitlisted
```

These numbers are generated from the database and update in real-time.

## Email Templates

### Application Received
```
Subject: Sanddock Application Received

Hi [Name],

Thanks for applying to Sanddock. We review all applications every Tuesday at 00:00 UTC. 
You'll hear back within 48 hours with specific feedback on your application.

Best,
The Sanddock Team
```

### Application Accepted
```
Subject: Welcome to Sanddock [Plan]

Hi [Name],

Congratulations! Your application has been accepted.

Here's what to do next:

1. Send USDT to pay for your subscription:
   - Amount: $[AMOUNT] USDT (TRC-20)
   - Wallet: [WALLET_ADDRESS]
   - Reference: [APP_ID] (include in memo or confirm after sending)

2. Once we receive your payment (usually within 2 minutes), we'll:
   - Activate your account
   - Send you your Telegram invite link
   - Add you to the Pro/Master channel

Questions? Reply to this email.

Welcome to the platform.
```

### Payment Received & Activated
```
Subject: Your Sanddock Account is Active

Hi [Name],

Perfect! We received your payment and your account is now active.

Your login: [EMAIL]
Dashboard: https://sanddock.io/terminal

Join the community:
[TELEGRAM_INVITE_LINK]

Let us know if you need anything.
```

## Renewal Workflow

### 7 Days Before Expiry
Send renewal email:
```
Hi [Name],

Your Sanddock [Plan] subscription renews in 7 days. 

To continue:
- Send [AMOUNT] USDT to [WALLET] with ref code [NEW_REF_CODE]

If you want to cancel, just reply to this email.
```

### 3 Days After Expiry
If payment not received:
```sql
UPDATE auth.users 
SET user_metadata = jsonb_set(user_metadata, '{plan}', '"free"')
WHERE id = 'USER_ID';
```

Account auto-downgrades to free.

## Success Metrics

### Week 1-2
- How many applications do you get?
- What's the average quality of risk management answers?
- Are they mostly Pro or Master?

### Month 1
- Acceptance rate (% of applications you approve)
- Average time from application to payment
- How many pay within 48 hours of acceptance?

### Month 3
- Retention: How many renewals without asking?
- Activation: % of accepted users who actually use the platform
- NPS: Net Promoter Score from your accepted cohort

## Common Questions

**Q: What if someone's application is great but they can't pay?**
A: You can offer extended payment terms, payment plan, or a trial period. The point is you decide, not the customer.

**Q: Should we accept crypto other than stablecoins?**
A: No. The goal is to avoid price volatility. BTC at $65k on Monday and $52k on Friday = accounting chaos. Stick to USDT/USDC.

**Q: What if the application process becomes a bottleneck?**
A: That's a good problem. At scale (50+ apps/week), automate the boring parts (email, payment confirmation) but keep the approval decision human.

**Q: Can we make price public?**
A: You can, but it defeats the FOMO. The magic is that price is part of the "reward" for getting accepted. Better to keep it hidden until acceptance email.

## Next Steps

1. **Day 1**: Run migration to create `applications` table
2. **Day 2**: Deploy updated `/pricing` and `/apply` pages
3. **Day 3**: Test admin dashboard with test applications
4. **Day 4**: Get USDT wallet address and update payment email templates
5. **Day 5**: Share admin dashboard link with team
6. **Week 1**: Set Tuesday review time and send first batch of responses
7. **Week 2+**: Track metrics and iterate

---

**This model works because it aligns incentives.** You want serious traders who understand risk. They want access to a tool that only lets serious traders in. The application process is how you both signal intent to each other.
