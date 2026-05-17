import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkId = user.id;
    const email = user.emailAddresses[0]?.emailAddress || "";

    // 1. Check if user exists in Supabase
    let { data: dbUser, error: selectError } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", clerkId)
      .single();

    if (selectError && selectError.code !== "PGRST116") { // PGRST116 is code for "no rows found"
      console.error("Supabase select error:", selectError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // 2. If user doesn't exist, create one (Lazy-sync)
    if (!dbUser) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          clerk_id: clerkId,
          email: email,
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
      }

      dbUser = newUser;
    }

    return NextResponse.json({ user: dbUser });
  } catch (error) {
    console.error("Error in /api/user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
