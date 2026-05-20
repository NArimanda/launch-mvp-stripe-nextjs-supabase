import { NextResponse } from "next/server";
import { createPublicSupabase } from "@/utils/supabase/public";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const supabase = createPublicSupabase();
  let query = supabase
    .from("movies")
    .select("id,slug,title,image_url,release_date")
    .order("release_date", { ascending: true })
    .limit(50);

  if (q.length >= 2) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ results: data ?? [] });
}
