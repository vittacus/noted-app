"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Sparkles, User, Plus } from "lucide-react";

const GRADIENT = "linear-gradient(135deg, #4fa8ff, #9747FF)";
const gradientTextStyle = {
  background: GRADIENT,
  WebkitBackgroundClip: "text" as const,
  backgroundClip: "text" as const,
  WebkitTextFillColor: "transparent" as const,
};

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
        active ? "" : "text-white/40 hover:text-white/70"
      }`}
    >
      {/* Icon: flat cyan when active (gradient fill on SVGs is unsupported) */}
      <Icon
        size={19}
        strokeWidth={active ? 2.2 : 1.8}
        className={active ? "text-[#4fa8ff]" : ""}
      />
      {/* Label: gradient text when active */}
      {active ? (
        <span style={gradientTextStyle}>{label}</span>
      ) : (
        <span>{label}</span>
      )}
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
          {/* Logo — gradient text via inline styles (bypasses Tailwind class overrides) */}
          <Link
            href="/"
            className="font-black text-2xl tracking-tighter"
            style={gradientTextStyle}
          >
            noted
          </Link>
        </div>
      </header>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0D0D0D]/90 backdrop-blur border-t border-white/8">
        <div className="max-w-2xl mx-auto flex items-end">

          <TabItem href="/" icon={Home} label="Home" active={pathname === "/"} />
          <TabItem href="/library" icon={BookOpen} label="Library" active={pathname.startsWith("/library")} />

          {/* Centre + button — gradient background */}
          <div className="flex-1 flex justify-center pb-1">
            <Link
              href="/search"
              className="w-[54px] h-[54px] rounded-full flex items-center justify-center shadow-xl -translate-y-4 active:scale-95 transition-all"
              style={{
                background: GRADIENT,
                boxShadow: "0 8px 24px rgba(79,168,255,0.35)",
              }}
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
