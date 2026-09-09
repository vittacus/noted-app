import Link from "next/link";

export default function ViewDemoButton() {
  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <Link
        href="/demo"
        className="px-7 py-3.5 border border-[#117ACA]/35 bg-[#117ACA]/8 text-[#117ACA] font-bold text-sm rounded-2xl hover:bg-[#117ACA]/15 hover:border-[#117ACA]/60 transition-all duration-200"
      >
        View Demo
      </Link>
      <p className="text-xs text-white/30">Explore a sample account — no sign-up needed</p>
    </div>
  );
}
