"use client";

export default function StickySidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden md:flex flex-col gap-6">
      {children}
    </div>
  );
}
