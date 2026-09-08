import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Noted — Rate Your Music",
  description: "Track, rate, and discover music you love",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      {/* style forces background even if Tailwind CSS variable cascade is overridden */}
      <body className={`${inter.className} min-h-full text-white`} style={{ backgroundColor: "#0d0d0f" }}>
        <div className="relative z-10">
          <Navigation />
          <main className="max-w-[1080px] xl:max-w-[1300px] 2xl:max-w-[1500px] mx-auto px-4 pb-24 pt-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
