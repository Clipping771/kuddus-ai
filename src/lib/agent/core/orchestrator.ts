// ==========================================
// ADAPTIVE COGNITIVE ORCHESTRATOR
// Rules: 
// 1. Fast Classifier first
// 2. Simple -> Direct
// 3. Medium -> Plan -> Execute
// 4. Complex -> Plan -> Execute -> Verify (max 1 retry)
// ==========================================

import { CostGovernor } from '../execution/cost';
import { ObservabilityLogger } from '../observability/logger';
import { MemoryEngine } from '../memory';
import { groqChatWithFallback, groqStreamWithFallback } from '@/lib/groq';

type ComplexityLevel = 'simple' | 'medium' | 'complex';

export class AdaptiveOrchestrator {
  private userId: string;
  private chatHistory: any[];
  private onStreamChunk?: (chunk: string) => void;
  private memoryFetched: boolean = false;
  private memoryContext: any = null;

  constructor(userId: string, chatHistory: any[] = []) {
    this.userId = userId;
    this.chatHistory = chatHistory;
  }

  // Emits the internal cognitive states to the frontend
  private emitStatus(statusText: string) {
    if (this.onStreamChunk) {
      this.onStreamChunk(`\n\n> 🧠 **System:** *${statusText}*\n\n`);
    }
    ObservabilityLogger.log('INFO', 'AdaptiveOrchestrator', statusText);
  }

  // Optional: Fetch memory if needed. (Rule 5: Always fetch before planning, but don't force it into simple)
  private async getMemory(omniscienceMode: boolean = false) {
    if (this.memoryFetched) return this.memoryContext;
    const memoryEngine = new MemoryEngine(this.userId);
    this.memoryContext = await memoryEngine.compileContext([], omniscienceMode);
    this.memoryFetched = true;
    return this.memoryContext;
  }

  // Rule 1: Hybrid Classifier (Heuristics first, LLM fallback)
  private async determineComplexity(taskInput: string): Promise<ComplexityLevel> {
    const text = taskInput.trim().toLowerCase();
    
    // HEURISTIC 1: Simple checks (Length, greetings)
    if (text.length < 50) {
      const simpleKeywords = ['hello', 'hi', 'hey', 'thanks', 'ok', 'good', 'bye', 'what is', 'who is', 'how are you'];
      if (simpleKeywords.some(k => text.startsWith(k))) return "simple";
    }
    
    // HEURISTIC 2: Complex checks (Code, Math, heavy logic)
    const complexKeywords = ['write a script', 'code', 'function', 'calculate', 'analyze', 'strategy', 'plan', 'debug'];
    if (text.length > 500 || complexKeywords.some(k => text.includes(k)) || /\{|\}|\[|\]|=/.test(text)) {
      return "complex";
    }

    // FALLBACK: LLM Classifier for ambiguous cases
    const prompt = `
Analyze the user's input and classify its complexity.
Input: "${taskInput}"

Classify as exactly ONE of:
- "simple": basic facts, short greetings, direct questions.
- "medium": needs some structure, summarization, or standard drafting.
- "complex": coding, multi-step math, deep strategic research, heavy analysis.

Reply with ONLY the word: simple, medium, or complex.
`;
    try {
      const res = await groqChatWithFallback({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0.1,
      }, this.userId);
      const output = res.choices[0]?.message?.content?.trim().toLowerCase() || "medium";
      if (output.includes("simple")) return "simple";
      if (output.includes("complex")) return "complex";
      return "medium";
    } catch {
      return "medium";
    }
  }

  // Main Entry Point
  async run(taskInput: string, omniscienceMode: boolean = false, onStreamChunk?: (chunk: string) => void) {
    this.onStreamChunk = onStreamChunk;
    
    // Fast classification
    const complexity = omniscienceMode ? 'complex' : await this.determineComplexity(taskInput);
    ObservabilityLogger.log('INFO', 'AdaptiveOrchestrator', `Complexity detected: ${complexity}`);

    if (complexity === 'simple') {
      return await this.executeSimple(taskInput);
    } else if (complexity === 'medium') {
      return await this.executeMedium(taskInput, omniscienceMode);
    } else {
      return await this.executeComplex(taskInput, omniscienceMode);
    }
  }

  // Path A: Simple (Direct LLM response, < 2s latency target)
  private async executeSimple(taskInput: string) {
    const messages = [...this.chatHistory, { role: "user", content: taskInput }];
    let fullResponse = "";
    
    if (this.onStreamChunk) {
      const stream = await groqStreamWithFallback({
        model: "llama-3.1-8b-instant", // Fast execution
        messages: messages as any,
        max_tokens: 1000,
        temperature: 0.5,
      }, this.userId);
      
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        fullResponse += text;
        this.onStreamChunk(text);
      }
    } else {
      const res = await groqChatWithFallback({
        model: "llama-3.1-8b-instant",
        messages: messages as any,
        max_tokens: 1000,
        temperature: 0.5,
      }, this.userId);
      fullResponse = res.choices[0]?.message?.content || "";
    }
    return fullResponse;
  }

  // Path B: Medium (Planner -> Executor -> Light Validation)
  private async executeMedium(taskInput: string, omniscienceMode: boolean) {
    this.emitStatus("Planning structure for response...");
    await this.getMemory(omniscienceMode);
    
    const plan = await this.generatePlan(taskInput);
    this.emitStatus("Executing plan...");
    
    const draft = await this.executeDraft(taskInput, plan, false); // Generate draft internally first
    
    this.emitStatus("Performing Light Validation...");
    // Light Validation: Simple heuristic check (e.g., ensure it's not empty, not just an error message)
    if (!draft || draft.trim().length < 20 || draft.includes("I cannot fulfill this request")) {
        this.emitStatus("Light Validation failed. Regenerating directly...");
        return await this.executeDraft(taskInput, "Please answer directly and clearly.", true);
    }
    
    if (this.onStreamChunk) this.onStreamChunk(draft);
    return draft;
  }

  // Path C: Complex (Planner -> Executor -> Verifier -> Max 1 Retry)
  private async executeComplex(taskInput: string, omniscienceMode: boolean) {
    this.emitStatus("Deep planning & strategy formulation...");
    await this.getMemory(omniscienceMode);
    
    let plan = await this.generatePlan(taskInput);
    this.emitStatus("Executing complex strategy...");
    
    // Wait for the full draft first (internal pass)
    let draft = await this.executeDraft(taskInput, plan, false); // Don't stream internal draft
    
    this.emitStatus("Verifying output (Self-Critic)...");
    const critique = await this.verifyDraft(taskInput, draft);
    
    if (critique === "PASS") {
      // If it's perfect, we now stream the known good draft back to user (simulated stream or just output)
      if (this.onStreamChunk) this.onStreamChunk(draft);
      return draft;
    } else {
      this.emitStatus("Critique found issues. Regenerating (Retry 1/1)...");
      // Rule 4: Max 1 retry
      plan += `\n\nCRITICAL FIXES REQUIRED BASED ON CRITIQUE: ${critique}`;
      return await this.executeDraft(taskInput, plan, true); // Stream the retry directly
    }
  }

  private async generatePlan(taskInput: string): Promise<string> {
    const plannerPrompt = `
You are the Internal Cognitive Planner.
Evaluate: "${taskInput}"

Decide:
1. What is the user REALLY asking?
2. What is the simplest correct solution?
3. What structure should the answer take?

Output ONLY a short, bulleted internal strategy plan.
`;
    try {
      const res = await groqChatWithFallback({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: plannerPrompt }],
        max_tokens: 250,
        temperature: 0.1,
      }, this.userId);
      return res.choices[0]?.message?.content || "Answer directly and accurately.";
    } catch {
      return "Answer directly.";
    }
  }

  private async executeDraft(taskInput: string, plan: string, streamResult: boolean = true): Promise<string> {
    const executorSystemPrompt = `
You are the Execution Engine. Follow this internal plan to answer the user:
---
${plan}
---
Provide the final, clean answer. Do not show the plan.
`;
    const messages = [
      { role: "system", content: executorSystemPrompt },
      ...this.chatHistory,
      { role: "user", content: taskInput }
    ];

    let fullResponse = "";
    
    if (this.onStreamChunk && streamResult) {
      const stream = await groqStreamWithFallback({
        model: "llama-3.3-70b-versatile", // Use larger model for execution
        messages: messages as any,
        max_tokens: 4000,
        temperature: 0.6,
      }, this.userId);
      
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        fullResponse += text;
        this.onStreamChunk(text);
      }
    } else {
      const res = await groqChatWithFallback({
        model: "llama-3.3-70b-versatile",
        messages: messages as any,
        max_tokens: 4000,
        temperature: 0.6,
      }, this.userId);
      fullResponse = res.choices[0]?.message?.content || "";
    }
    
    return fullResponse;
  }

  private async verifyDraft(taskInput: string, draft: string): Promise<string> {
    const criticPrompt = `
Analyze this draft response.
Input: "${taskInput}"

Critique for:
1. Hallucinations
2. Logical errors or bad code
3. Missing essential info

If the draft is strong, output EXACTLY: "PASS"
If flawed, output the specific flaws briefly.

Draft:
---
${draft}
---
`;
    try {
      const res = await groqChatWithFallback({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: criticPrompt }],
        max_tokens: 150,
        temperature: 0.1,
      }, this.userId);
      return res.choices[0]?.message?.content?.trim() || "PASS";
    } catch {
      return "PASS";
    }
  }
}
