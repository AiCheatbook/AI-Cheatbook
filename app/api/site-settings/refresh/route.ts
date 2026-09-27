import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/*
 * Called by /admin/settings after saving, so every page picks up
 * the new icon, logo and menu switches straight away instead of
 * on its next scheduled refresh. Admins only.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Not logged in." },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Admins only." },
      { status: 403 }
    );
  }

  revalidatePath("/", "layout");

  return NextResponse.json({ success: true });
}
