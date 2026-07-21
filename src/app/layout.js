import localFont from "next/font/local";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

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

export const metadata = {
  title: "Sanddock - AI Crypto Trading Signals | Heikin Ashi Buy & Sell Alerts",
  description: "Real-time AI-powered Buy and Sell signals for Bitcoin and 50+ crypto coins. Heikin Ashi-based alerts with AI explanation delivered to Telegram and your dashboard. Verified track record. Start free - no credit card needed.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${instrumentSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

