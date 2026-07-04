import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
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

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Sanddock - AI Crypto Trading Signals | Heikin Ashi Buy & Sell Alerts",
  description: "Real-time AI-powered Buy and Sell signals for Bitcoin and 50+ crypto coins. Heikin Ashi-based alerts with AI explanation delivered to Telegram and your dashboard. Verified track record. Start free - no credit card needed.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

