import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import MusicNotes from "@/components/MusicNotes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Noted — Rate Your Music",
  description: "Track, rate, and discover music you love",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      {/* style forces background even if Tailwind CSS variable cascade is overridden */}
      <body className={`${inter.className} min-h-full text-white`} style={{ backgroundColor: "#0D0D0D" }}>
        <MusicNotes />
        <div className="relative z-10">
          <Navigation />
          <main className="max-w-2xl mx-auto px-4 pb-24 pt-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
