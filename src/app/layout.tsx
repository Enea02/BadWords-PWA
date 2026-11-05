import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Courier_Prime, DM_Sans } from "next/font/google";
import { LITERAL } from "@design/tokens";
import "./globals.css";

const alfaSlab = Alfa_Slab_One({
  variable: "--font-alfa-slab",
  weight: "400",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  axes: ["opsz"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Swear Jar",
  description: "La carta fedeltà al contrario: ogni parolaccia è un timbro.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: LITERAL.paperLight },
    { media: "(prefers-color-scheme: dark)", color: LITERAL.paperDark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${alfaSlab.variable} ${dmSans.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
