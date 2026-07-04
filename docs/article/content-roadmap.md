# Sanddock Content Roadmap - Batch 1 Complete + Remaining Pipeline

## Batch 1 - COMPLETE (10 articles, ready to publish)

| # | File | Target Keyword | Cluster |
|---|---|---|---|
| 1 | 01-what-is-heikin-ashi.md | heikin ashi | Heikin Ashi pillar |
| 2 | 02-heikin-ashi-vs-candlestick.md | heikin ashi vs candlestick | Heikin Ashi comparison |
| 3 | 03-how-to-read-heikin-ashi-candles.md | how to read heikin ashi candles | Heikin Ashi how-to |
| 4 | 04-stop-loss-take-profit-crypto-trading.md | what is a stop loss | Educational |
| 5 | 05-are-crypto-signals-legit.md | are crypto signals legit | Trust/anti-hype |
| 6 | 06-public-track-record-transparency.md | crypto signal track record | Flagship trust asset |
| 7 | 07-best-ai-crypto-trading-signals-2026.md | best ai crypto trading signals | Listicle |
| 8 | 08-best-crypto-signals-telegram-channels.md | best crypto signals telegram | Listicle |
| 9 | 09-3commas-alternative.md | 3commas alternative | Competitor |
| 10 | 10-cryptohopper-review.md | cryptohopper review | Competitor |

All 10 follow the same template: frontmatter metadata block for Antigravity's page builder, answer-first opening, question-style H2s, FAQ section, embedded JSON-LD schema (Article + FAQPage), and a contextual CTA. None contain fabricated performance statistics - the track-record article specifically uses dynamic placeholders that must be wired to the live database (see dev note inside that file).

---

## Batch 2 - Remaining Competitor Pages (highest commercial intent, write next)

These follow the exact template established in articles 9 and 10. Priority order reflects complaint volume and search intent found in research - write the highest-complaint-volume competitors first since those pages convert best.

| Target Keyword | Search Intent | Notes from Research |
|---|---|---|
| cornix alternative / cornix review | Commercial | Complaint patterns: auto-renewal without clear consent, refund refusals, signal-provider fee-stacking. Cornix is execution-focused - natural "pairs with a signal source" angle. |
| trendspider alternative / trendspider review | Commercial | Complaint patterns: steep learning curve, price ($54–149/mo), AI assistant message limits run out fast. Position Sanddock as the beginner-friendly, crypto-native alternative to a stocks-first power-user tool. |
| wundertrading review | Commercial | Lowest-cost TradingView-to-trade bridge; strong on Pine Script integration. Compare clarity/signal-quality rather than price. |
| altrady review | Commercial | Strong value pricing (~$19–55/mo), genuinely useful free trial - fair competitor, position on transparency/track-record angle specifically. |
| zignaly alternative | Commercial | Different model - performance-fee/profit-share, not subscription. Good page to explain the model difference itself. |
| cryptosignals.org review / alternative | Commercial, high differentiation | Heaviest complaint volume in the whole competitive set - cancellation difficulty, scam allegations on Trustpilot/SourceForge. High-value page; lead with the trust/transparency contrast. |
| coinigy alternative | Commercial | Coinigy is charting/portfolio, not really a signal competitor - frame as "if you came here for signals, here's what Coinigy doesn't do." |
| alertatron review | Commercial, lower volume | Niche automation tool; brief comparison page, lower priority. |
| pionex review | Commercial | Free built-in bots, monetizes via trading fees not subscription - good "free isn't always free" angle (spread/fee costs vs subscription cost). |

---

## Batch 3 - Educational / Informational (low competition, high LLM-citation potential)

| Target Keyword | Search Intent | Notes |
|---|---|---|
| how do crypto trading bots work | Informational | Plain-English explainer; strong AI-citation candidate per research (question-format, low difficulty). |
| how to read crypto signals | Informational | Beginner guide - how to interpret entry/SL/TP/confidence score on any signal, not just Sanddock's. |
| swing trading crypto for beginners | Informational/commercial | Broader pillar than Heikin Ashi specifically; can internally link to articles 1–3. |
| crypto signal accuracy explained | Informational | Pairs naturally with "are crypto signals legit" (article 5) - focus on realistic win-rate math, R:R, why 90%+ claims are implausible. |
| what is a confidence score in trading signals | Informational, low competition, near-zero competition since it's close to a Sanddock-specific term | High citation potential - nobody else explains this concept clearly. |
| heikin ashi strategy guide | Informational, medium volume | Deeper pillar than article 1 - specific entry/exit strategies built on HA, swing trading application. |
| what is swing trading vs day trading crypto | Informational, comparison | Common beginner confusion point. |
| crypto risk management for beginners | Informational | Broader than stop-loss/take-profit (article 4) - position sizing, the 1-2% rule, diversification basics. |

---

## Batch 4 - Comparison / Versus Pages

| Target Keyword | Search Intent | Notes |
|---|---|---|
| crypto signals vs trading bots | Comparison | Explains the category distinction referenced throughout competitor pages - good hub page to link FROM all competitor articles. |
| ai vs rule-based crypto trading signals | Comparison | Ties to the fast-growing "AI trading" cluster identified in research. |
| heikin ashi vs renko charts | Comparison | Adjacent charting-technique comparison, lower volume but very low competition. |
| free vs paid crypto signals - what's actually different | Comparison | High-intent - directly addresses the free-to-paid upgrade decision Sanddock needs users to make. |

---

## Batch 5 - Listicles & Growing AI Cluster (highest citation-rate format per research)

| Target Keyword | Search Intent | Notes |
|---|---|---|
| best crypto trading bots 2026 | Commercial, high volume | Broader than article 7 (signals specifically) - covers execution-focused tools (3Commas, Cryptohopper, Pionex, WunderTrading) with Sanddock positioned for the "pair with a signal source" angle. |
| best free crypto signals 2026 | Commercial, high volume | Free-tier-focused listicle - leads with Sanddock's free BTC plan as the benchmark for "what a real free tier should include." |
| AI crypto trading explained (2026 guide) | Informational, fast-growing per research | Capture the rapidly growing "agentic AI trading" search trend identified in Stage research - explain what's real vs hype in 2026 AI trading tools. |
| best ai crypto trading bots 2026 | Commercial, fast-growing | Adjacent to article 7 but bot-execution framed rather than signal framed - avoid keyword cannibalization by keeping the framing distinct. |
| agentic ai trading - what it actually means | Informational, emerging cluster | New 2026 terminology; early-mover content opportunity since few sources explain it plainly yet. |

---

## Batch 6 - Sanddock Product/Methodology Deep-Dives (flagship, unique content)

These can only be written by Sanddock and are the strongest long-term LLM-citation assets, since no competitor can produce equivalent original content.

| Topic | Angle |
|---|---|
| How Sanddock's AI confidence score is calculated | Methodology transparency - volume confirmation, trend alignment, structural cleanliness factors. Ties directly to the technical implementation already built. |
| New, Slide, Commit - how Sanddock's signal states work | Explains the three-state swing detection logic in plain English; highly specific, zero competition, demonstrates real engineering depth. |
| What multi-timeframe confluence means (and why it matters) | Master-tier feature explainer; positions the upgrade while teaching a genuine concept. |
| Why Sanddock doesn't auto-trade for you | Addresses "why no execution" proactively - frames manual decision-making as a deliberate safety choice, not a missing feature. |

---

## Execution Notes for Whoever Writes Batches 2–6

Follow the exact template from Batch 1: frontmatter block, 40-60 word answer-first opening under the H1, question-style H2s each followed immediately by a direct answer, a comparison table for any versus/alternative page, an FAQ section of 3-5 questions marked up with FAQPage schema, a visible "last updated" date, and a contextual CTA (not the same CTA copy repeated everywhere - vary it based on the article's specific angle, as done across articles 1-10).

Never insert a specific fabricated win rate, return percentage, or performance number for Sanddock anywhere in any article. Use the same dynamic-placeholder approach as article 6 if a stat needs to appear, and flag it clearly for the dev team as done in that file's dev note.

For competitor pages, keep every claim traceable to what's publicly reported (reviews, pricing pages, documented incidents) rather than inventing specifics - the goal is fair, factual differentiation, not disparagement, both because it's accurate and because it's better positioning long-term.