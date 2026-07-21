import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const PRICING_DETAILS = {
  pro: {
    name: 'Pro Plan',
    coins: 'BTC + ETH + BNB (Top 3 pairs)',
    features: [
      'Real-time Telegram alerts',
      'Automated Stop Loss & Take Profit',
      'P&L dashboard & performance metrics',
      'CSV export of signal history',
      '24h priority email support'
    ]
  },
  master: {
    name: 'Master Plan',
    coins: 'All 15 premium altcoins',
    features: [
      'Unlimited Telegram alerts & channels',
      'Multi-timeframe trend confluence analysis',
      'Full P&L history & CSV export',
      'Automated Stop Loss & Take Profit',
      '12h priority email support',
      'Webhook integration for automation'
    ]
  }
};

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, name, plan } = body;

    if (!email || !name || !plan) {
      return Response.json(
        { error: 'Missing required fields: email, name, plan' },
        { status: 400 }
      );
    }

    const planDetails = PRICING_DETAILS[plan.toLowerCase()];
    if (!planDetails) {
      return Response.json(
        { error: `Invalid plan: ${plan}` },
        { status: 400 }
      );
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; }
    .section { margin-bottom: 25px; }
    .section h2 { color: #000; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #ff5722; padding-bottom: 10px; }
    .plan-name { font-size: 24px; font-weight: bold; color: #ff5722; margin-bottom: 15px; }
    .features { list-style: none; padding: 0; }
    .features li { padding: 8px 0; padding-left: 25px; position: relative; }
    .features li:before { content: "✓"; position: absolute; left: 0; color: #00b050; font-weight: bold; }
    .cta-button { display: inline-block; background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 15px; }
    .cta-button:hover { background: #ff5722; }
    .telegram-section { background: #e3f2fd; padding: 20px; border-radius: 4px; border-left: 4px solid #2196F3; margin: 20px 0; }
    .telegram-link { color: #2196F3; text-decoration: none; font-weight: bold; }
    .footer { background: #000; color: #fff; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
    .divider { border-top: 1px solid #e0e0e0; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🎉 Application Approved!</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Welcome to Sanddock, ${name}</p>
    </div>

    <div class="content">
      <p style="font-size: 16px; margin-top: 0;">Your application for <strong>${planDetails.name}</strong> has been approved!</p>

      <div class="section">
        <h2>Your Plan Details</h2>
        <div class="plan-name">${planDetails.name}</div>
        <p><strong>Coins & Pairs:</strong> ${planDetails.coins}</p>
        <div style="margin-top: 15px;">
          <strong>Features:</strong>
          <ul class="features">
            ${planDetails.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="divider"></div>

      <div class="telegram-section">
        <strong style="font-size: 16px; color: #2196F3;">💬 Next Step: Complete Payment</strong>
        <p style="margin: 10px 0 0 0; font-size: 14px;">
          To activate your ${planDetails.name}, please contact us on Telegram to finalize payment details.
        </p>
        <p style="margin: 15px 0 0 0; font-size: 14px; font-weight: bold;">
          📲 Telegram: <a href="https://t.me/alexsanddockcom" class="telegram-link">t.me/alexsanddockcom</a>
        </p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
          Click the link above or search for <code>@alexsanddockcom</code> on Telegram
        </p>
      </div>

      <div class="section">
        <h2>What Happens Next?</h2>
        <ol style="margin: 0; padding-left: 20px; color: #555;">
          <li>Contact us via Telegram at <a href="https://t.me/alexsanddockcom" class="telegram-link">t.me/alexsanddockcom</a></li>
          <li>Complete payment setup for your plan</li>
          <li>Receive your account activation confirmation</li>
          <li>Start receiving verified trading signals immediately</li>
        </ol>
      </div>

      <div class="section">
        <p style="font-size: 14px; color: #666; margin: 0;">
          <strong>Questions?</strong> Reach out on Telegram and we'll help you get started right away.
        </p>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0; font-size: 11px;">
        Signals are for educational purposes only - not financial advice. Past signals do not guarantee future results.
      </p>
      <p style="margin: 10px 0 0 0; font-size: 11px;">
        © 2026 Sanddock. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const response = await resend.emails.send({
      from: 'Sanddock <onboarding@resend.dev>',
      to: email,
      subject: `🎉 Your ${planDetails.name} Application is Approved!`,
      html: emailHtml
    });

    if (response.error) {
      console.error('Resend Error:', response.error);
      return Response.json(
        { error: 'Failed to send email', details: response.error },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: `Approval email sent to ${email}`,
      emailId: response.data?.id
    });
  } catch (error) {
    console.error('Error sending approval email:', error);
    return Response.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
