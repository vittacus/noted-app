import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Noted — Rate Your Music",
  description: "Track, rate, and discover music you love",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full bg-[#0f0f13] text-slate-100`}>
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 pb-24 pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
