/**
 * GET /api/user/profile
 * Returns user's behavior profile for adaptive UI personalization.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { getUserBehaviorProfile } from "@/lib/userBehavior";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) return NextResponse.json({ profile: null });

        const { data: dbUser } = await supabase
            .from("users").select("id").eq("clerk_id", clerkId).single();

        if (!dbUser) return NextResponse.json({ profile: null });

        const profile = await getUserBehaviorProfile(dbUser.id);
        return NextResponse.json({ profile });
    } catch {
        return NextResponse.json({ profile: null });
    }
}
