import { NextRequest, NextResponse } from 'next/server';
import { HardenedOrchestrator } from '@/lib/agent/core/orchestrator';
import { ResponseEngine } from '@/lib/agent/output/response';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { task, hermes_mode } = body;

    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }

    // 1. Initialize Hardened Orchestrator
    const orchestrator = new HardenedOrchestrator(userId);

    // 2. Start the Control Plane Loop
    await orchestrator.run(task, hermes_mode === true);

    // 3. Format Output via Response Engine
    const finalState = orchestrator.getState();
    const structuredResponse = ResponseEngine.format(finalState);

    return NextResponse.json({
      success: finalState.status !== 'error' && finalState.status !== 'aborted',
      status: finalState.status,
      cost_used_usd: finalState.cost_used,
      structured_response: structuredResponse
    });

  } catch (error: any) {
    console.error('[Agent API] Hard Failure:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
