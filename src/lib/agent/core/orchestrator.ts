// ==========================================
// ADAPTIVE COGNITIVE ORCHESTRATOR (API OPTIMIZED)
// Rules: 
// 1. Fast Heuristic Classifier (No LLM fallback)
// 2. Simple -> Direct LLM Call
// 3. Complex -> Memory Injection -> Execute
// ==========================================

import { ObservabilityLogger } from '../observability/logger';
import { MemoryEngine } from '../memory';
import { groqChatWithFallback, groqStreamWithFallback } from '@/lib/groq';

type ComplexityLevel = 'simple' | 'complex';

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

  // Emits the internal cognitive states to logs ONLY (no UI leak)
  private emitStatus(statusText: string) {
    // onStreamChunk is bypassed here to prevent reasoning from leaking into user UI
    ObservabilityLogger.log('INFO', 'AdaptiveOrchestrator', statusText);
  }

  // Fetch memory if needed.
  private async getMemory(omniscienceMode: boolean = false) {
    if (this.memoryFetched) return this.memoryContext;
    const memoryEngine = new MemoryEngine(this.userId);
    this.memoryContext = await memoryEngine.compileContext([], omniscienceMode);
    this.memoryFetched = true;
    return this.memoryContext;
  }

  // Fast Hybrid Classifier (Heuristics ONLY)
  private determineComplexity(taskInput: string): ComplexityLevel {
    const text = taskInput.trim().toLowerCase();
    
    // HEURISTIC 1: Extremely simple, short queries (Greetings, fast facts)
    if (text.length < 50) {
      const simpleKeywords = ['hello', 'hi', 'hey', 'thanks', 'ok', 'good', 'bye', 'what is', 'who is'];
      if (simpleKeywords.some(k => text.startsWith(k))) return "simple";
    }
    
    // HEURISTIC 2: Complex checks (Code, strategy, or long queries)
    const codeKeywordsRegex = /\b(const|let|function|def |import |class |export |interface |type )\b/;
    const strategyKeywordsRegex = /\b(strategy|plan|analyze|compare|explain|architect|design|review|how to)\b/;
    
    // If it's a decent length query, or matches any code/strategy keywords, use the complex (70B) path
    if (text.length > 120 || codeKeywordsRegex.test(text) || strategyKeywordsRegex.test(text)) {
      return "complex";
    }

    // Default fallback: complex (to prioritize quality for ambiguous medium-length queries)
    return "complex";
  }

  // Main Entry Point
  async run(taskInput: string, omniscienceMode: boolean = false, onStreamChunk?: (chunk: string) => void) {
    this.onStreamChunk = onStreamChunk;
    
    // Fast classification
    const complexity = omniscienceMode ? 'complex' : this.determineComplexity(taskInput);
    ObservabilityLogger.log('INFO', 'AdaptiveOrchestrator', `Complexity detected: ${complexity}`);

    if (complexity === 'simple') {
      return await this.executeSimple(taskInput);
    } else {
      return await this.executeTask(taskInput, omniscienceMode);
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
        stream: true,
      }, this.userId) as any;
      
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

  // Path B: Complex (Memory Injection -> Executor directly - API Optimized)
  private async executeTask(taskInput: string, omniscienceMode: boolean) {
    this.emitStatus("Formulating strategy and fetching memory...");
    await this.getMemory(omniscienceMode);
    
    this.emitStatus("Executing complex strategy...");
    
    // Execute directly and stream the result
    return await this.generateResponse(taskInput); 
  }

  private async generateResponse(taskInput: string): Promise<string> {
    const systemPrompt = `You are the Execution Engine. Answer the user's request directly and highly accurately. Do not show internal planning.`;
    
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Inject memory context if available
    if (this.memoryContext) {
      const memoryString = typeof this.memoryContext === "object" ? JSON.stringify(this.memoryContext, null, 2) : String(this.memoryContext);
      messages.push({ role: "system", content: `## USER MEMORY CONTEXT\n${memoryString}` });
    }

    messages.push(...this.chatHistory);
    messages.push({ role: "user", content: taskInput });

    let fullResponse = "";
    
    if (this.onStreamChunk) {
      const stream = await groqStreamWithFallback({
        model: "llama-3.3-70b-versatile", // Use larger model for execution
        messages: messages as any,
        max_tokens: 4000,
        temperature: 0.6,
        stream: true,
      }, this.userId) as any;
      
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
}
