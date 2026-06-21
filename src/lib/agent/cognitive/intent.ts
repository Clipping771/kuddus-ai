// ==========================================
// INTENT CLASSIFIER
// Principle: Lightweight initial classification
// ==========================================

export class IntentClassifier {
  static classify(userInput: string): { intent: string; baseRisk: number } {
    const input = userInput.toLowerCase();
    
    if (input.includes('delete') || input.includes('drop') || input.includes('remove')) {
      return { intent: 'destructive_action', baseRisk: 0.9 };
    }
    if (input.includes('code') || input.includes('run') || input.includes('execute')) {
      return { intent: 'code_execution', baseRisk: 0.8 };
    }
    if (input.includes('plan') || input.includes('strategy') || input.includes('advise')) {
      return { intent: 'strategic_planning', baseRisk: 0.3 };
    }
    
    return { intent: 'general_query', baseRisk: 0.1 };
  }
}
