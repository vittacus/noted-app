"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, BookOpen, Sparkles, User } from "lucide-react";

const nav = [
  { href: "/",        icon: Home,     label: "Home"    },
  { href: "/search",  icon: Search,   label: "Search"  },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/moods",   icon: Sparkles, label: "Moods"   },
  { href: "/profile", icon: User,     label: "Profile" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#1a2332]/80 backdrop-blur border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="font-black text-2xl tracking-tighter text-[#4fc3f7]">
            noted
          </Link>
        </div>
      </header>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#1a2332]/90 backdrop-blur border-t border-white/5">
        <div className="max-w-2xl mx-auto flex">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
                  active ? "text-[#4fc3f7]" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
