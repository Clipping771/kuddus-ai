// ==========================================
// RESPONSE ENGINE (PRODUCT LEVEL)
// Principle: Strict 5-part structured format
// ==========================================

import { HardenedState } from '../core/orchestrator';

export interface StructuredResponse {
  direct_answer: string;
  reasoning_summary: string;
  risk_warning: string | null;
  action_steps: string[];
  confidence_score: number;
}

export class ResponseEngine {
  static format(state: HardenedState): StructuredResponse {
    let directAnswer = state.status === 'success' 
      ? 'Task successfully completed.' 
      : 'Task was degraded or aborted to maintain safety.';

    if (state.emotion?.tone === 'supportive') {
      directAnswer = `I understand this is challenging, but ${directAnswer}`;
    }

    return {
      direct_answer: directAnswer,
      reasoning_summary: `Executed ${state.retries} retries utilizing ${state.cost_used.toFixed(4)} USD.`,
      risk_warning: state.risk_level > 0.6 ? 'High risk actions were mitigated via the Sandbox Gate.' : null,
      action_steps: state.contract?.steps || [],
      confidence_score: state.status === 'success' ? 0.95 : 0.4
    };
  }
}
