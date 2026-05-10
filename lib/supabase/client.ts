import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Log once so the URL is verifiable in DevTools without exposing the key
  if (typeof window !== "undefined" && !(window as any).__supabaseUrlLogged) {
    console.log("[supabase] client URL:", url);
    (window as any).__supabaseUrlLogged = true;
  }
  return createBrowserClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
