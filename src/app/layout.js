import localFont from "next/font/local";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://sanddock.com").replace(/\/$/, "");

const satoshi = localFont({
  src: [
    {
      path: "../../public/font/Satoshi-Variable.ttf",
      style: "normal",
    },
    {
      path: "../../public/font/Satoshi-Light.otf",
      weight: "300",
      style: "normal",
    }
  ],
  variable: "--font-satoshi",
});

// Hero typography. Self-hosted by next/font so there is no render-blocking
// request to Google and no layout shift.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const TITLE = "Sanddock - AI Crypto Trading Signals | Heikin Ashi Buy & Sell Alerts";
const DESCRIPTION =
  "Real-time AI-powered Buy and Sell signals for Bitcoin and 50+ crypto coins. Heikin Ashi-based alerts with AI explanation delivered to Telegram and your dashboard. Verified track record. Start free - no credit card needed.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Sanddock",
  },
  description: DESCRIPTION,
  keywords: [
    "crypto trading signals",
    "AI crypto signals",
    "Heikin Ashi signals",
    "Bitcoin buy sell alerts",
    "crypto signal Telegram",
    "verified crypto track record",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Sanddock",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/sanddock-logo.png",
        width: 512,
        height: 512,
        alt: "Sanddock",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/sanddock-logo.png"],
  },
  icons: {
    icon: "/sanddock-logo.png",
    apple: "/sanddock-logo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

// Organization + WebSite JSON-LD, present on every page. This is the entity
// graph that both classic search (Knowledge Panels) and AI answer engines
// (ChatGPT, Perplexity, Gemini) use to identify who "Sanddock" is before
// citing anything from the site.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Sanddock",
      url: SITE_URL,
      logo: `${SITE_URL}/sanddock-logo.png`,
      description: DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Sanddock",
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${instrumentSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <AuthProvider>
          {children}
        </AuthProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}

