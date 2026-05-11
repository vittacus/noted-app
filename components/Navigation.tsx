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
      className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
        active ? "text-[#4fa8ff]" : "text-[#8686AC] hover:text-slate-300"
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
      <header className="sticky top-0 z-40 bg-[#0F0E47]/80 backdrop-blur border-b border-[#505081]/40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="font-black text-2xl tracking-tighter text-[#4fa8ff]">
            noted
          </Link>
        </div>
      </header>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#0F0E47]/90 backdrop-blur border-t border-[#505081]/40">
        <div className="max-w-2xl mx-auto flex items-end">

          <TabItem href="/" icon={Home} label="Home" active={pathname === "/"} />
          <TabItem href="/library" icon={BookOpen} label="Library" active={pathname.startsWith("/library")} />

          {/* Centre + button — raised above the nav bar */}
          <div className="flex-1 flex justify-center pb-1">
            <Link
              href="/search"
              className="w-[54px] h-[54px] rounded-full bg-[#4fa8ff] flex items-center justify-center shadow-xl shadow-[#4fa8ff]/30 -translate-y-4 hover:bg-[#90c5ff] active:scale-95 transition-all"
            >
              <Plus size={24} className="text-[#080735]" strokeWidth={2.8} />
            </Link>
          </div>

          <TabItem href="/moods" icon={Sparkles} label="Moods" active={pathname.startsWith("/moods")} />
          <TabItem href="/profile" icon={User} label="Profile" active={pathname.startsWith("/profile")} />

        </div>
      </nav>
    </>
  );
}
