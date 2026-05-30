/**
 * Goal Engine API — Kacha Morich AI
 *
 * User says: "I want to get a software engineering job"
 * AI creates a structured Goal with sub-tasks, tracks progress automatically.
 *
 * POST /api/goals        — create a new goal (AI generates sub-tasks)
 * GET  /api/goals        — fetch all goals for user
 * PATCH /api/goals       — update goal or sub-task progress
 * DELETE /api/goals      — delete a goal
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { groqChatWithFallback } from "@/lib/groq";

export const dynamic = "force-dynamic";

// ─── GET — fetch all goals ────────────────────────────────────────────────────
export async function GET() {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: dbUser } = await supabase
            .from("users").select("id").eq("clerk_id", clerkId).single();
        if (!dbUser) return NextResponse.json({ goals: [] });

        const { data: goals, error } = await supabase
            .from("user_goals")
            .select("*")
            .eq("user_id", dbUser.id)
            .order("created_at", { ascending: false });

        if (error) {
            // Table might not exist yet — return empty gracefully
            console.warn("[Goals] Fetch error (table may not exist):", error.message);
            return NextResponse.json({ goals: [] });
        }

        return NextResponse.json({ goals: goals || [] });
    } catch (err) {
        console.error("[Goals] GET error:", err);
        return NextResponse.json({ goals: [] });
    }
}

// ─── POST — create a new goal with AI-generated sub-tasks ────────────────────
export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { goal: goalText } = await req.json();
        if (!goalText || typeof goalText !== "string") {
            return NextResponse.json({ error: "goal text is required" }, { status: 400 });
        }

        const { data: dbUser } = await supabase
            .from("users").select("id").eq("clerk_id", clerkId).single();
        if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // AI generates structured sub-tasks for the goal
        const prompt = `You are a goal decomposition expert. Break down this goal into actionable sub-tasks.

Goal: "${goalText}"

Return ONLY a JSON object:
{
  "title": "Short goal title (max 60 chars)",
  "category": "career|business|learning|health|finance|personal|other",
  "estimatedDays": 30,
  "subTasks": [
    {"title": "Sub-task title", "description": "What to do", "order": 1},
    {"title": "Sub-task title", "description": "What to do", "order": 2}
  ],
  "successCriteria": "How to know when this goal is achieved"
}

Rules:
- 3-7 sub-tasks, ordered logically
- Each sub-task should be completable in 1-7 days
- Be specific and actionable, not vague
- estimatedDays: realistic total timeline`;

        let goalData: any = null;
        try {
            const completion = await groqChatWithFallback(
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                    max_tokens: 600,
                },
                dbUser.id
            );
            const raw = completion.choices[0]?.message?.content?.trim() || "";
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) goalData = JSON.parse(jsonMatch[0]);
        } catch (aiErr) {
            console.warn("[Goals] AI generation failed, using defaults:", aiErr);
        }

        // Fallback if AI fails
        if (!goalData) {
            goalData = {
                title: goalText.substring(0, 60),
                category: "personal",
                estimatedDays: 30,
                subTasks: [
                    { title: "Define the goal clearly", description: "Write down exactly what success looks like", order: 1 },
                    { title: "Research and plan", description: "Gather information and create an action plan", order: 2 },
                    { title: "Take first action", description: "Complete the first concrete step", order: 3 },
                    { title: "Review progress", description: "Check progress and adjust plan if needed", order: 4 },
                ],
                successCriteria: "Goal achieved as defined",
            };
        }

        // Save to DB
        const { data: newGoal, error: insertError } = await supabase
            .from("user_goals")
            .insert({
                user_id: dbUser.id,
                title: goalData.title || goalText.substring(0, 60),
                original_text: goalText,
                category: goalData.category || "personal",
                status: "active",
                progress: 0,
                estimated_days: goalData.estimatedDays || 30,
                sub_tasks: goalData.subTasks || [],
                success_criteria: goalData.successCriteria || "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            // Table doesn't exist — return the AI-generated data without saving
            console.warn("[Goals] Insert error (table may not exist):", insertError.message);
            return NextResponse.json({
                goal: {
                    id: `temp-${Date.now()}`,
                    title: goalData.title,
                    category: goalData.category,
                    status: "active",
                    progress: 0,
                    sub_tasks: goalData.subTasks,
                    success_criteria: goalData.successCriteria,
                    estimated_days: goalData.estimatedDays,
                },
                warning: "Goal generated but not saved — database table not set up yet",
            });
        }

        return NextResponse.json({ goal: newGoal });
    } catch (err) {
        console.error("[Goals] POST error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── PATCH — update goal progress or sub-task completion ─────────────────────
export async function PATCH(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { goalId, progress, status, subTaskIndex, subTaskCompleted } = await req.json();
        if (!goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });

        const { data: dbUser } = await supabase
            .from("users").select("id").eq("clerk_id", clerkId).single();
        if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Fetch current goal
        const { data: goal, error: fetchError } = await supabase
            .from("user_goals")
            .select("*")
            .eq("id", goalId)
            .eq("user_id", dbUser.id)
            .single();

        if (fetchError || !goal) {
            return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }

        const updates: any = { updated_at: new Date().toISOString() };

        // Update sub-task completion
        if (typeof subTaskIndex === "number" && typeof subTaskCompleted === "boolean") {
            const subTasks = [...(goal.sub_tasks || [])];
            if (subTasks[subTaskIndex]) {
                subTasks[subTaskIndex] = { ...subTasks[subTaskIndex], completed: subTaskCompleted };
            }
            updates.sub_tasks = subTasks;

            // Auto-calculate progress from completed sub-tasks
            const completedCount = subTasks.filter((t: any) => t.completed).length;
            updates.progress = Math.round((completedCount / subTasks.length) * 100);

            // Auto-complete goal if all sub-tasks done
            if (updates.progress === 100) {
                updates.status = "completed";
                updates.completed_at = new Date().toISOString();
            }
        }

        if (typeof progress === "number") updates.progress = progress;
        if (status) updates.status = status;

        const { data: updated, error: updateError } = await supabase
            .from("user_goals")
            .update(updates)
            .eq("id", goalId)
            .eq("user_id", dbUser.id)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
        }

        return NextResponse.json({ goal: updated });
    } catch (err) {
        console.error("[Goals] PATCH error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── DELETE — remove a goal ───────────────────────────────────────────────────
export async function DELETE(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const goalId = url.searchParams.get("id");
        if (!goalId) return NextResponse.json({ error: "id is required" }, { status: 400 });

        const { data: dbUser } = await supabase
            .from("users").select("id").eq("clerk_id", clerkId).single();
        if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { error } = await supabase
            .from("user_goals")
            .delete()
            .eq("id", goalId)
            .eq("user_id", dbUser.id);

        if (error) return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Goals] DELETE error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
