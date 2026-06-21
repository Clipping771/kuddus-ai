import { NextRequest, NextResponse } from 'next/server';
import { AdaptiveOrchestrator } from '@/lib/agent/core/orchestrator';
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

    // 1. Initialize Adaptive Orchestrator
    const orchestrator = new AdaptiveOrchestrator(userId);

    // 2. Start the Control Plane Loop
    const finalResponse = await orchestrator.run(task, hermes_mode === true);

    return NextResponse.json({
      success: true,
      status: 'success',
      structured_response: finalResponse
    });

  } catch (error: any) {
    console.error('[Agent API] Hard Failure:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
