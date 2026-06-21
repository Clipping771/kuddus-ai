// ==========================================
// E2B MANDATORY SANDBOX GATE
// Principle: No direct tool execution
// ==========================================

import { ObservabilityLogger } from '../observability/logger';
import { ExecutionContract } from '../core/contract';

export class SandboxGate {
  static async executeSafe(toolName: string, args: any, contract: ExecutionContract | null) {
    ObservabilityLogger.log('INFO', 'SandboxGate', `Evaluating request for tool: ${toolName}`);

    if (!contract || !contract.valid) {
      ObservabilityLogger.log('CRITICAL', 'SandboxGate', `Blocked tool execution: Invalid or missing contract.`);
      throw new Error("Execution blocked by Safety Sandbox Gate");
    }

    if (!contract.tools_required.includes(toolName)) {
      ObservabilityLogger.log('ERROR', 'SandboxGate', `Tool ${toolName} not authorized in current contract.`);
      throw new Error(`Tool ${toolName} unauthorized.`);
    }

    ObservabilityLogger.log('INFO', 'SandboxGate', `Executing tool safely: ${toolName}`);
    // MOCK: Integration with real tool registry goes here
    return `Successfully executed ${toolName}`;
  }
}
