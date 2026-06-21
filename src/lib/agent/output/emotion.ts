// ==========================================
// EMOTION DERIVATION LAYER
// Principle: Output formatting system, not "feelings"
// ==========================================

export type Tone = 'strict' | 'supportive' | 'motivational' | 'analytical';

export interface EmotionState {
  tone: Tone;
  empathyLevel: number;
}

export class EmotionEngine {
  /**
   * Derives emotion strictly based on signals, without guessing.
   */
  static derive(userHistory: any[], currentToneStr: string, intentRisk: number, frustrationSignals: boolean): EmotionState {
    let tone: Tone = 'analytical';
    let empathyLevel = 0.5;

    if (frustrationSignals) {
      tone = 'supportive';
      empathyLevel = 0.8;
    } else if (intentRisk > 0.7) {
      // High risk intent overrides other tones to become strict
      tone = 'strict';
      empathyLevel = 0.2;
    } else if (currentToneStr.includes('fail') || currentToneStr.includes('quit')) {
      tone = 'motivational';
      empathyLevel = 0.9;
    }

    return { tone, empathyLevel };
  }

  static getModifierPrompt(state: EmotionState): string {
    if (state.tone === 'strict') return `Be brutally honest, highlight the high risk, and enforce strict boundaries.`;
    if (state.tone === 'supportive') return `Provide structured empathy: explain why the issue happened analytically, then offer the fix.`;
    if (state.tone === 'motivational') return `Reframe the failure as actionable data. Provide a strong pivot plan.`;
    return `Maintain an objective, data-driven, and analytical tone.`;
  }
}
