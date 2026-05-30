/**
 * Workflow Engine API — Kacha Morich AI
 *
 * GET  /api/workflows           — list workflow templates + user workflows
 * POST /api/workflows           — create workflow from text description
 * POST /api/workflows/execute   — execute a workflow with input
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import {
    WORKFLOW_TEMPLATES,
    parseWorkflowFromText,
    executeWorkflowStep,
    type WorkflowStep,
} from "@/lib/workflowEngine";

export const dynamic = "force-dynamic";

// GET — return workflow templates
export async function GET() {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        return NextResponse.json({
            templates: WORKFLOW_TEMPLATES,
        });
    } catch (err) {
        console.error("[Workflows] GET error:", err);
        return NextResponse.json({ templates: [] });
    }
}

// POST — create a workflow from natural language OR execute one
export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: dbUser } = await supabase
            .from("users").select("id").eq("clerk_id", clerkId).single();
        if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const body = await req.json();

        // Execute mode — run a workflow with input
        if (body.execute && body.steps && body.input) {
            const steps: WorkflowStep[] = body.steps;
            const input: string = body.input;

            const results: Array<{ stepId: string; name: string; output: string; status: string }> = [];
            const previousOutputs: string[] = [];

            for (const step of steps) {
                try {
                    const stepInput = previousOutputs.length > 0
                        ? previousOutputs[previousOutputs.length - 1]
                        : input;

                    const output = await executeWorkflowStep(step, stepInput, previousOutputs, dbUser.id);
                    previousOutputs.push(output);
                    results.push({ stepId: step.id, name: step.name, output, status: "completed" });
                } catch (stepErr: any) {
                    results.push({ stepId: step.id, name: step.name, output: "", status: "failed" });
                    console.error(`[Workflows] Step "${step.name}" failed:`, stepErr.message);
                    break; // Stop on failure
                }
            }

            return NextResponse.json({ results, finalOutput: previousOutputs[previousOutputs.length - 1] || "" });
        }

        // Parse mode — create workflow from text description
        if (body.description) {
            const workflow = await parseWorkflowFromText(body.description, dbUser.id);
            if (!workflow) {
                return NextResponse.json({ error: "Could not parse workflow" }, { status: 400 });
            }
            return NextResponse.json({ workflow });
        }

        return NextResponse.json({ error: "Provide either description or execute+steps+input" }, { status: 400 });
    } catch (err) {
        console.error("[Workflows] POST error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
