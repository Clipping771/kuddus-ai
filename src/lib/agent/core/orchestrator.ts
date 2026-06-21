// ==========================================
// THE HARD CONTROL PLANE (ORCHESTRATOR)
// Principle: Every action is traceable, every decision reversible
// ==========================================

import { CostGovernor } from '../execution/cost';
import { ObservabilityLogger } from '../observability/logger';
import { IntentClassifier } from '../cognitive/intent';
import { PolicyEngine } from './policy';
import { ContractSystem, ExecutionContract } from './contract';
import { MemoryEngine } from '../memory';
import { EmotionEngine, EmotionState } from '../output/emotion';

export type OrchestratorStep = 'plan' | 'execute' | 'verify' | 'retry' | 'fail';

export interface HardenedState {
  taskId: string;
  taskInput: string;
  step: OrchestratorStep;
  retries: number;
  cost_used: number;
  risk_level: number;
  contract: ExecutionContract | null;
  emotion: EmotionState | null;
  status: 'running' | 'degraded' | 'aborted' | 'success';
}

export class HardenedOrchestrator {
  private state: HardenedState;
  private costGovernor: CostGovernor;
  private memory: MemoryEngine;

  constructor(userId: string) {
    this.memory = new MemoryEngine(userId);
    this.costGovernor = new CostGovernor(0.05); // 5 cents budget
    
    this.state = {
      taskId: `task_${Date.now()}`,
      taskInput: '',
      step: 'plan',
      retries: 0,
      cost_used: 0,
      risk_level: 0,
      contract: null,
      emotion: null,
      status: 'running'
    };
  }

  getState() {
    return this.state;
  }

  async run(taskInput: string, omniscienceMode: boolean = false) {
    ObservabilityLogger.log('INFO', 'Orchestrator', `Starting Hardened Loop for task: ${this.state.taskId}`);
    this.state.taskInput = taskInput;
    
    // 0. Fetch Context (with Hermes Mode support)
    const context = await this.memory.compileContext([], omniscienceMode);
    if (omniscienceMode) {
      ObservabilityLogger.log('INFO', 'Orchestrator', `Hermes Mode ACTIVATED. Loaded ${context.episodic.length} episodic records and ${context.failure.length} failure records.`);
    }

    // 1. Intent Classification
    const { intent, baseRisk } = IntentClassifier.classify(taskInput);
    this.state.risk_level = baseRisk;
    ObservabilityLogger.log('INFO', 'IntentClassifier', `Intent: ${intent}, Risk: ${baseRisk}`);

    // 2. Policy Engine Safety Check
    if (!PolicyEngine.evaluate(baseRisk, 'free')) { // 'free' is default tier mock
      this.state.status = 'aborted';
      ObservabilityLogger.log('CRITICAL', 'Orchestrator', 'Aborted by Policy Engine.');
      return;
    }

    // 3. Emotion Derivation
    this.state.emotion = EmotionEngine.derive([], taskInput, baseRisk, false);

    // Enter State Machine
    while (this.state.status === 'running' || this.state.status === 'degraded') {
      await this.tick();
    }
  }

  private async tick() {
    this.state.cost_used = this.costGovernor.getCurrentCost();
    
    if (this.costGovernor.isOverBudget()) {
      ObservabilityLogger.log('WARN', 'Orchestrator', 'Budget exhausted. Initiating safe degradation.');
      this.state.status = 'degraded';
      this.state.step = 'fail';
      return;
    }

    ObservabilityLogger.log('INFO', 'Orchestrator', `[STATE TICK] Step: ${this.state.step}`);

    switch (this.state.step) {
      case 'plan':
        await this.handlePlan();
        break;
      case 'execute':
        await this.handleExecute();
        break;
      case 'verify':
        await this.handleVerify();
        break;
      case 'retry':
        await this.handleRetry();
        break;
      case 'fail':
        ObservabilityLogger.log('ERROR', 'Orchestrator', 'Terminal failure reached.');
        this.state.status = 'aborted';
        break;
    }
  }

  private async handlePlan() {
    // Mock Multi-Strategy Planner output
    this.costGovernor.recordCost(0.005, 'Planner');
    const mockSteps = [{ id: '1', description: 'Analyze input' }];
    
    // Contract Enforcement
    this.state.contract = ContractSystem.build('analyze', mockSteps, this.state.risk_level);
    
    if (!ContractSystem.enforce(this.state.contract)) {
      ObservabilityLogger.log('CRITICAL', 'Orchestrator', 'Contract enforcement failed. Aborting.');
      this.state.step = 'fail';
      return;
    }

    this.state.step = 'execute';
  }

  private async handleExecute() {
    this.costGovernor.recordCost(0.01, 'Executor');
    // MOCK: Sandbox tool execution
    ObservabilityLogger.log('INFO', 'Sandbox', 'Executing safe step.');
    
    this.state.step = 'verify';
  }

  private async handleVerify() {
    this.costGovernor.recordCost(0.002, 'Verifier');
    const isSuccess = true; // MOCK Verification

    if (isSuccess) {
      this.state.status = 'success';
      ObservabilityLogger.log('INFO', 'Orchestrator', 'Verification passed. Task successful.');
    } else {
      this.state.step = 'retry';
    }
  }

  private async handleRetry() {
    if (this.state.retries >= 3) {
      ObservabilityLogger.log('ERROR', 'Orchestrator', 'Max retries exceeded. Logging to Failure Memory.');
      await this.memory.logFailure('L2 Tool Error', 'Max retries hit', 'Fallback safe mode');
      this.state.step = 'fail';
      return;
    }
    
    this.state.retries++;
    ObservabilityLogger.log('INFO', 'Orchestrator', `Retrying execution. Attempt ${this.state.retries}`);
    this.state.step = 'execute';
  }
}
