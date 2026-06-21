// ==========================================
// COST GOVERNOR
// Principle: Every request has a budget
// ==========================================
import { ObservabilityLogger } from '../observability/logger';

export interface Budget {
  maxCostUsd: number;
  currentCostUsd: number;
}

export class CostGovernor {
  private budget: Budget;

  constructor(maxCostUsd: number = 0.05) { // Default 5 cents per transaction
    this.budget = {
      maxCostUsd,
      currentCostUsd: 0
    };
  }

  recordCost(costUsd: number, component: string) {
    this.budget.currentCostUsd += costUsd;
    ObservabilityLogger.log('INFO', 'CostGovernor', `Cost incurred`, { costUsd, total: this.budget.currentCostUsd });
    
    if (this.isOverBudget()) {
      ObservabilityLogger.log('WARN', 'CostGovernor', 'Budget Exceeded. Safe mode engaged.');
    }
  }

  isOverBudget(): boolean {
    return this.budget.currentCostUsd >= this.budget.maxCostUsd;
  }

  shouldDegradeToFastModel(): boolean {
    // If we have consumed 80% of our budget, switch to fast model (Llama3 / GPT-4o-mini)
    return this.budget.currentCostUsd >= (this.budget.maxCostUsd * 0.8);
  }

  getCurrentCost(): number {
    return this.budget.currentCostUsd;
  }
}
