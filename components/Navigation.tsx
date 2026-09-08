"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Sparkles, User, Plus } from "lucide-react";

const AMBER = "#F64568";
const amberTextStyle = { color: AMBER };

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
      <Icon
        size={19}
        strokeWidth={active ? 2.2 : 1.8}
        style={active ? amberTextStyle : undefined}
      />
      <span style={active ? amberTextStyle : undefined}>{label}</span>
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-[#41436A]/85 backdrop-blur border-b border-white/[0.07]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link
            href="/"
            className="font-black text-2xl tracking-tighter"
            style={amberTextStyle}
          >
            noted
          </Link>
        </div>
      </header>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#41436A]/90 backdrop-blur border-t border-white/[0.07]">
        <div className="max-w-2xl mx-auto flex items-end">

          <TabItem href="/" icon={Home} label="Home" active={pathname === "/"} />
          <TabItem href="/library" icon={BookOpen} label="Library" active={pathname.startsWith("/library")} />

          {/* Centre + button — solid amber, black icon */}
          <div className="flex-1 flex justify-center pb-1">
            <Link
              href="/search"
              className="w-[54px] h-[54px] rounded-full flex items-center justify-center shadow-xl -translate-y-4 active:scale-95 transition-all"
              style={{
                background: AMBER,
                boxShadow: "0 8px 24px rgba(246,69,104,0.35)",
              }}
            >
              <Plus size={24} className="text-black" strokeWidth={2.8} />
            </Link>
          </div>

          <TabItem href="/moods" icon={Sparkles} label="Moods" active={pathname.startsWith("/moods")} />
          <TabItem href="/profile" icon={User} label="Profile" active={pathname.startsWith("/profile")} />

        </div>
      </nav>
    </>
  );
}
