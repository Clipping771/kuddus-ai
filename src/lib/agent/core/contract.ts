// ==========================================
// CONTRACT SYSTEM (STRICT MODE)
// Principle: No contract = no execution
// ==========================================

import { ObservabilityLogger } from '../observability/logger';

export interface ExecutionContract {
  intent: string;
  steps: string[];
  tools_required: string[];
  risk_level: 'low' | 'medium' | 'high';
  cost_ceiling_usd: number;
  expected_schema: any;
  valid: boolean;
}

export class ContractSystem {
  static enforce(contract: ExecutionContract): boolean {
    ObservabilityLogger.log('INFO', 'ContractSystem', 'Evaluating contract validity...');

    if (!contract.intent || contract.steps.length === 0) {
      ObservabilityLogger.log('ERROR', 'ContractSystem', 'Contract invalid: Missing intent or steps.');
      contract.valid = false;
      return false;
    }

    if (contract.risk_level === 'high' && !contract.tools_required.includes('runCode')) {
      // Logic enforcement
      ObservabilityLogger.log('WARN', 'ContractSystem', 'Contract logic mismatch: High risk but no sandbox requested.');
    }

    if (contract.cost_ceiling_usd <= 0) {
      ObservabilityLogger.log('ERROR', 'ContractSystem', 'Contract invalid: No budget allocated.');
      contract.valid = false;
      return false;
    }

    contract.valid = true;
    ObservabilityLogger.log('INFO', 'ContractSystem', 'Contract enforced and valid.');
    return true;
  }

  static build(intent: string, steps: any[], risk: number): ExecutionContract {
    const toolsRequired = steps.reduce((acc, step) => {
      if (step.description.toLowerCase().includes('search')) acc.add('searchWeb');
      if (step.description.toLowerCase().includes('file')) acc.add('readFile');
      if (step.description.toLowerCase().includes('code')) acc.add('runCode');
      return acc;
    }, new Set<string>());

    const risk_level = risk > 0.7 || toolsRequired.has('runCode') ? 'high' : risk > 0.4 ? 'medium' : 'low';

    return {
      intent,
      steps: steps.map(s => s.description),
      tools_required: Array.from(toolsRequired),
      risk_level,
      cost_ceiling_usd: 0.05, // Hardcoded ceiling per contract
      expected_schema: { success: "boolean", output: "string" },
      valid: false // Needs to pass enforce()
    };
  }
}
