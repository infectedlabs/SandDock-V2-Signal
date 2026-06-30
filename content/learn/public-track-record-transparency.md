---
title: "Why We Publish Every Losing Trade: Inside Sanddock's Public Track Record"
meta_description: Sanddock publishes every signal it sends — wins and losses — to a public, timestamped, unedited log. Here's why, and how the system is built to prevent cherry-picking.
slug: /learn/public-track-record-transparency
target_keyword: crypto signal track record
secondary_keywords: transparent crypto signals, crypto signals with proof, verified trading signals
content_type: flagship-trust
schema_types: Article, FAQPage
last_updated: 2026-06-30
author: Sanddock Team
---

# Why We Publish Every Losing Trade: Inside Sanddock's Public Track Record

Most crypto signal services show you their best calls. We show you all of them.

Every signal Sanddock's engine fires — every Buy, every Sell, every win, and every loss — is written to a public, timestamped log the moment it happens. Nothing gets removed afterward. Nothing gets quietly edited. If a signal loses, it stays on the record exactly like a signal that wins. That's not a marketing claim — it's a structural decision about how the system was built, and you can verify it yourself.

> [View the live, unedited track record →](/track-record)

## The problem we built this to solve

If you've spent any time researching crypto signal services, you've probably noticed something: nearly every provider claims an extremely high win rate, and almost none of them show you a complete, independently verifiable history to back it up. What you typically get instead is a curated feed of screenshots — the trades that worked, presented without the context of how many didn't.

This isn't always deliberate dishonesty. Sometimes it's simply that there's no system in place that *forces* every signal to be recorded and kept, win or lose. But the effect on you, the trader trying to evaluate whether a service is worth paying for, is the same either way: you have no real way to know if the signals actually work, because you're only ever seeing a fraction of the picture.

## How Sanddock's track record actually works

When the signal engine detects a swing top or swing bottom and fires a Buy or Sell alert, that signal is written to the database at that exact moment — entry price, timestamp, AI confidence score, and the plain-English rationale behind the call. From that point forward, the engine tracks the live market price against that signal's stop-loss and take-profit levels. When the price hits one or the other (or the opposite signal fires first), the trade is marked closed with its actual result, whatever that result is.

There is no step in this process where a human decides whether a particular signal "counts" or gets included in the public record. Every signal that fires gets logged. Every signal that closes gets its real outcome recorded. The track record page simply displays this data directly from the same database the signal engine writes to — it isn't a separate, editable summary maintained by a marketing team.

## What you'll actually find on the track record page

The public track record shows the complete signal history: date and time, trading pair, signal direction, entry price, exit price, the reason it closed (take-profit hit, stop-loss hit, or the opposite signal forming), and the resulting percentage outcome — positive or negative. As of the last update, the page reflects **[live signal count — pulled dynamically from the signals database]** signals logged since tracking began, with a **[live win/loss breakdown — pulled dynamically]** split between profitable and unprofitable outcomes.

We're intentionally not printing a fixed win-rate number in this article, because a number frozen in an article goes stale the moment the next signal closes. The actual, current figures live on the track record page itself, updating in real time as signals close — which is the entire point of building it this way.

## Why this matters more than any single statistic

A track record that updates in real time and can't be selectively edited is worth more than any single performance number, because the *number itself* isn't the differentiator — the verifiability is. A 65% win rate you can independently confirm is more trustworthy than a 90% win rate you have to take on faith. We'd rather you trust the process than trust a claim.

This also means the track record will, at times, show losing streaks. It will show signals that looked strong on paper and still hit a stop loss. That's not a flaw in the presentation — it's what an honest record of any trading system looks like over time, because no signal method, technical or AI-assisted, wins every time. A system that claims otherwise isn't being shown to you honestly.

## What we want you to do with this information

Don't take our word for any of this — that defeats the purpose. Go look at the track record directly, filter it by coin or by date range, and see the losing trades alongside the winning ones. Compare what you find there against any other signal service you're considering, and ask that service the same question we're answering here: can you see every signal, including the ones that lost?

If the answer is no, that tells you something important before you ever pay for anything.

## Frequently asked questions

**Does Sanddock delete or hide losing signals?**
No. Every signal that fires is written to the database at the moment it happens and is never removed. The public track record reads directly from that same database, so there is no separate, editable version that could exclude losses.

**How often is the track record updated?**
The track record updates in real time as signals open and close — it is not a periodically refreshed summary, but a live view of the underlying signal data.

**Can the track record data be edited after a signal closes?**
No. Once a signal is recorded as closed with its outcome, that record is treated as final. This is a deliberate design choice to prevent any possibility of selective editing after the fact.

**Is a transparent track record the same as a guarantee of future performance?**
No. A transparent track record tells you honestly what has happened so far — it does not and cannot predict what will happen with future signals. Past results, however accurately reported, are not a guarantee of future outcomes.

---

**See it for yourself — no signup required.** [View Sanddock's full, unedited track record →](/track-record)

<!-- ============================================ -->
<!-- SCHEMA MARKUP — for Antigravity to embed in <head> -->
<!-- ============================================ -->
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "Why We Publish Every Losing Trade: Inside Sanddock's Public Track Record",
      "description": "Sanddock publishes every signal it sends — wins and losses — to a public, timestamped, unedited log. Here's why, and how the system is built to prevent cherry-picking.",
      "author": { "@type": "Organization", "name": "Sanddock" },
      "publisher": { "@type": "Organization", "name": "Sanddock" },
      "dateModified": "2026-06-30"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Does Sanddock delete or hide losing signals?", "acceptedAnswer": { "@type": "Answer", "text": "No. Every signal that fires is written to the database at the moment it happens and is never removed; the public track record reads directly from that same database." } },
        { "@type": "Question", "name": "How often is the track record updated?", "acceptedAnswer": { "@type": "Answer", "text": "The track record updates in real time as signals open and close." } },
        { "@type": "Question", "name": "Can the track record data be edited after a signal closes?", "acceptedAnswer": { "@type": "Answer", "text": "No. Once a signal is recorded as closed, that record is treated as final to prevent selective editing." } },
        { "@type": "Question", "name": "Is a transparent track record the same as a guarantee of future performance?", "acceptedAnswer": { "@type": "Answer", "text": "No. A transparent track record reports what has already happened; it does not predict or guarantee future outcomes." } }
      ]
    }
  ]
}
```

<!-- ============================================ -->
<!-- DEV NOTE FOR ANTIGRAVITY -->
<!-- ============================================
This page contains TWO dynamic placeholders that must be wired to live data,
not hardcoded:
1. "[live signal count]" — pull from `SELECT COUNT(*) FROM signals WHERE action = 'new'`
2. "[live win/loss breakdown]" — pull from `/api/v1/performance/summary` endpoint
   (see sanddock-technical-implementation.md for the exact query)

Do NOT hardcode a win rate or signal count in this article's copy. The entire
credibility of this page depends on the numbers being real and current.
If real data isn't available yet at launch, omit the bracketed sentence
entirely rather than inventing a placeholder statistic.
-->
