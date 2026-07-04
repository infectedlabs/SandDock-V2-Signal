---
title: How Sanddock's AI Confidence Score Is Calculated
meta_description: Learn how Sanddock calculates its AI confidence score. Discover the metrics, volume analysis, trend confluence, and algorithms that score every crypto buy and sell signal.
slug: /learn/how-sanddocks-ai-confidence-score-is-calculated
target_keyword: sanddock confidence score
secondary_keywords: ai signal confidence, sanddock ai analysis, win rate optimization, signal accuracy score
content_type: pillar
schema_types: Article, FAQPage
last_updated: 2026-06-30
author: Sanddock Research Team
---

# How Sanddock's AI Confidence Score Is Calculated

The **Sanddock confidence score** is a numerical rating from 40% to 95% assigned to every Buy and Sell signal. It is calculated by analyzing key market indicators, including volume relative to its 20-bar average, multi-timeframe trend alignment, and swing structure history, to help traders quickly assess the probability and strength of a technical setup before entering a position.

> **See it in action**: Sanddock's signal engine runs Heikin Ashi swing detection and calculates real-time confidence scores for Bitcoin - free, no card required. [Start free today →](/signup)

## What is the Sanddock confidence score?

The Sanddock confidence score is an analytical tool designed to filter out weak or low-probability setups in highly volatile crypto markets. Instead of treating every technical swing reversal equally, Sanddock's scoring engine evaluates the market conditions surrounding the signal and assigns a percentage score. The goal is to provide traders with a quick, data-driven assessment of whether a signal is firing in a high-probability trend environment or during a low-volume, choppy consolidation phase.

By categorizing signals into clear confidence tiers, traders can apply different position-sizing or execution rules based on the score.

| Confidence Tier | Score Range | Typical Market Condition | Suggested Approach |
|---|---|---|---|
| **High Confidence** | 75% to 95% | Strong trend alignment, high volume breakout, clean swing structure | Standard position size, high-probability setup |
| **Medium Confidence** | 50% to 74% | Minor trend divergence, average volume, standard swing structure | Reduced position size, watch for confirmations |
| **Low Confidence** | 40% to 49% | Counter-trend signal, low volume, choppy or sideways market | Exercise caution, potential fakeout risk |

## How is the confidence score calculated?

Sanddock calculates the confidence score using a weighted, rule-based formula that combines raw volume statistics, Heikin Ashi candlestick relationships, and swing structure states. The calculation begins with a baseline score of 60 points and adjusts dynamically up or down based on three core technical checks: volume deviation, higher-timeframe trend confluence, and the historical confirmation of preceding swings.

Here is a breakdown of the specific variables used in the engine:

1. **Base Score**: The signal starts with a neutral baseline of 60 points.
2. **Volume Analysis**: The engine checks the volume of the triggering bar against the 20-bar volume average. If the current volume exceeds the average, it adds points.
3. **Trend Alignment**: The engine compares the current timeframe (e.g., 15m) with the higher timeframe (e.g., 1h) trend. Alignment adds points, while divergence subtracts points.
4. **Swing Structure State**: The engine checks if the preceding swings were cleanly committed or if they suffered from rapid state flips. Clean history adds points.

The final score is clamped between 40% and 95% to ensure it remains realistic and prevents overstating system capabilities.

## Why does volume play a major role in confidence scoring?

Volume is the primary metric for verifying the strength of a price movement, as high volume indicates institutional participation and strong market agreement. In the Sanddock confidence model, a swing bottom (Buy signal) accompanied by volume that is 20% or more above its 20-bar simple moving average (SMA) represents a high-probability reversal, adding up to 10 percentage points to the signal's confidence score.

Conversely, a swing signal that fires on low or declining volume is treated with suspicion. Low-volume moves are easily manipulated and often lead to false breakouts. When volume is below the 20-bar average, the score remains at or below the baseline, warning traders that the setup lacks the momentum needed for a clean run.

## What is trend alignment and why does it affect the score?

Trend alignment refers to the confluence between the short-term signal timeframe and the broader, higher-timeframe trend. Trading in the direction of the dominant trend is one of the most fundamental principles of risk management, which is why the engine analyzes whether a 15-minute swing signal aligns with the 1-hour and 4-hour Heikin Ashi trend before calculating the final confidence score.

For example, a Buy signal that fires on the 15-minute chart will receive a significant confidence boost if the 1-hour Heikin Ashi candle is also green and trading above its moving average. If the 1-hour trend is bearish, however, the 15-minute Buy signal is categorized as counter-trend, and the engine reduces the confidence score to reflect the increased risk of trading against the primary market direction.

## How does swing structure history influence confidence?

Swing structure history refers to how cleanly the market has responded to prior swing signals, indicating whether the current asset is trading in a clean, predictable rhythm or experiencing choppy consolidation. The scoring engine evaluates the last three swing groups; if these swings reached their targets or resolved with clean "commit" states, the system increases the current signal's score by 5%.

If the history shows rapid, alternating "signal flips"-where a Buy signal is immediately cancelled by a Sell signal within a few bars-it suggests a trendless, volatile range. The engine recognizes this pattern and lowers the confidence score to prevent traders from getting chopped up in sideways markets.

## Why is the confidence score not a guarantee of winning?

No mathematical model or technical indicator can guarantee a winning trade, because markets are complex systems influenced by unpredictable external events such as news releases, regulatory changes, and sudden liquidity shifts. The Sanddock confidence score is a statistical probability tool based on historical patterns, meaning that even a 95% confidence signal can result in a loss if market conditions suddenly shift.

Traders should never use a high confidence score as an excuse to ignore risk management. Regardless of whether a signal is rated 40% or 95%, you must always use a stop loss, calculate your position size based on your account risk tolerance, and accept that losing trades are an inevitable part of a sustainable trading system.

## Frequently asked questions

**What is the minimum confidence score for a signal to fire?**
The signal engine will fire alerts for setups starting at a 40% confidence score. We do not hide lower-scoring signals, as some traders use them for counter-trend scalp strategies, but we clearly label them so you can manage your risk accordingly.

**How does Sanddock prevent "score inflation"?**
Our engine is programmed with a hard cap at 95%. No signal will ever display a 100% confidence score, because a perfect trade does not exist in financial markets. We keep the scoring transparent to maintain an anti-hype, realistic environment.

**Can I filter signals by confidence score on the dashboard?**
Yes. The Sanddock dashboard includes a filter panel that allows you to display only high-confidence signals (75% and above), helping you focus on the highest-probability setups.

**Does a 95% confidence signal mean I should use higher leverage?**
No. Leverage increases your risk proportionally. A higher confidence score means the technical setup is stronger and cleaner, not that it is risk-free. You should keep your position sizing and leverage consistent with your overall risk management plan.

---

**Want to see how our engine scores live setups?** Get real-time Bitcoin signals with full AI explanations and confidence scores completely free. [Start free →](/signup)

<!-- ============================================ -->
<!-- SCHEMA MARKUP - for Antigravity to embed in <head> -->
<!-- ============================================ -->
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "How Sanddock's AI Confidence Score Is Calculated",
      "description": "Learn how Sanddock calculates its AI confidence score. Discover the metrics, volume analysis, trend confluence, and algorithms that score every crypto buy and sell signal.",
      "author": { "@type": "Organization", "name": "Sanddock" },
      "publisher": { "@type": "Organization", "name": "Sanddock" },
      "dateModified": "2026-06-30"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the minimum confidence score for a signal to fire?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The signal engine fires alerts starting at a 40% confidence score. Lower-scoring signals are visible but clearly labeled, allowing traders to filter them out if they prefer to focus solely on high-probability setups."
          }
        },
        {
          "@type": "Question",
          "name": "How does Sanddock prevent 'score inflation'?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The engine has a hard cap at 95%. No signal will ever show a 100% score, as no technical setup is guaranteed to win. This prevents misleading marketing and sets realistic expectations."
          }
        },
        {
          "@type": "Question",
          "name": "Can I filter signals by confidence score on the dashboard?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, the dashboard includes robust filtering controls, letting you set a minimum confidence threshold (such as 75% or 80%) so that you only see signals that meet your specific strategy standards."
          }
        },
        {
          "@type": "Question",
          "name": "Does a 95% confidence signal mean I should use higher leverage?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Leverage increases risk proportionally regardless of the signal's quality. Always maintain strict position-sizing rules and never let a high confidence score tempt you to over-leverage your account."
          }
        }
      ]
    }
  ]
}
```
