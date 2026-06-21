// ==========================================
// FAILURE CLASSIFICATION VERIFIER
// Principle: L1-L5 Failure Taxonomy
// ==========================================

import { ObservabilityLogger } from '../observability/logger';

export type FailureLevel = 'L1_Reasoning' | 'L2_Tool' | 'L3_System' | 'L4_Memory' | 'L5_Hallucination' | 'None';

export class Verifier {
  static checkFailure(feedback: string, isTimeout: boolean = false): FailureLevel {
    if (isTimeout) return 'L3_System';
    
    const fb = feedback.toLowerCase();
    
    if (fb.includes('hallucinat') || fb.includes('fake') || fb.includes('imagined')) {
      ObservabilityLogger.log('CRITICAL', 'Verifier', 'L5 Hallucination detected. Initiating rollback.');
      return 'L5_Hallucination';
    }
    
    if (fb.includes('conflict') || fb.includes('contradict')) {
      ObservabilityLogger.log('WARN', 'Verifier', 'L4 Memory Conflict detected. Isolating memory.');
      return 'L4_Memory';
    }
    
    if (fb.includes('tool') || fb.includes('execution') || fb.includes('sandbox')) {
      ObservabilityLogger.log('WARN', 'Verifier', 'L2 Tool Failure. Initiating retry with fallback.');
      return 'L2_Tool';
    }

    if (fb.includes('logic') || fb.includes('wrong')) {
      ObservabilityLogger.log('INFO', 'Verifier', 'L1 Reasoning Failure. Replanning.');
      return 'L1_Reasoning';
    }

    return 'None';
  }
}
