import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Naija Outbid — Pay to rank",
  description:
    "Public Nigerian leaderboard. Bid in naira via Paystack to claim your rank.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <header className="site-header">
          <Link href="/" className="brand">
            Naija Outbid
          </Link>
          <nav>
            <Link href="/submit">Submit / Bid</Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <span>Min bid ₦2,000 · Whole naira · Ranked by total paid</span>
        </footer>
      </body>
    </html>
  );
}
