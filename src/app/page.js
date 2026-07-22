import Homepage from "@/components/Homepage";
import { faqItems } from "@/data/faq";

// FAQPage + SoftwareApplication JSON-LD. FAQ Q&A pairs are exactly the shape
// AI answer engines (ChatGPT, Perplexity, Google AI Overviews) lift and cite
// directly, so this mirrors the on-page FAQ accordion in Homepage.jsx.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
    {
      "@type": "SoftwareApplication",
      name: "Sanddock",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      description:
        "AI-powered crypto trading signals with a public, verified track record. Real-time Buy/Sell alerts for Bitcoin and 50+ coins with entry, stop-loss, and take-profit.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free plan: live BTC/USDT signals forever, no credit card required.",
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Homepage />
    </>
  );
}

