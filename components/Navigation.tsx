"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Sparkles, User, Plus } from "lucide-react";

function TabItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-all ${
        active ? "text-[#4fa8ff]" : "text-white/40 hover:text-white/70"
      }`}
    >
      <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-[#0D0D0D]/85 backdrop-blur border-b border-white/8">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          {/* Gradient text logo */}
          <Link href="/" className="font-black text-2xl tracking-tighter text-gradient">
            noted
          </Link>
        </div>
      </header>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0D0D0D]/90 backdrop-blur border-t border-white/8">
        <div className="max-w-2xl mx-auto flex items-end">

          <TabItem href="/" icon={Home} label="Home" active={pathname === "/"} />
          <TabItem href="/library" icon={BookOpen} label="Library" active={pathname.startsWith("/library")} />

          {/* Centre + button — gradient, raised above the nav bar */}
          <div className="flex-1 flex justify-center pb-1">
            <Link
              href="/search"
              className="w-[54px] h-[54px] rounded-full flex items-center justify-center shadow-xl -translate-y-4 active:scale-95 transition-all bg-gradient-accent"
              style={{ boxShadow: "0 8px 24px rgba(79,168,255,0.35)" }}
            >
              <Plus size={24} className="text-white" strokeWidth={2.8} />
            </Link>
          </div>

          <TabItem href="/moods" icon={Sparkles} label="Moods" active={pathname.startsWith("/moods")} />
          <TabItem href="/profile" icon={User} label="Profile" active={pathname.startsWith("/profile")} />

        </div>
      </nav>
    </>
  );
}
