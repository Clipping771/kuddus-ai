// ==========================================
// POLICY ENGINE
// Principle: Rules + Safety + Cost Limits
// ==========================================

import { ObservabilityLogger } from '../observability/logger';

export class PolicyEngine {
  static evaluate(intentRisk: number, userTier: string = 'free'): boolean {
    ObservabilityLogger.log('INFO', 'PolicyEngine', 'Evaluating safety policy...');

    if (intentRisk >= 0.9 && userTier !== 'admin') {
      ObservabilityLogger.log('WARN', 'PolicyEngine', 'High risk intent rejected for non-admin user.');
      return false; // Abort
    }

    if (intentRisk >= 0.7 && userTier === 'free') {
      ObservabilityLogger.log('WARN', 'PolicyEngine', 'Medium-High risk intent rejected for free user.');
      return false; // Abort
    }

    ObservabilityLogger.log('INFO', 'PolicyEngine', 'Policy check passed.');
    return true;
  }
}
