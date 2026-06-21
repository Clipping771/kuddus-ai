import { createClient } from '@supabase/supabase-js';
import { ObservabilityLogger } from '../observability/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface MemoryContext {
  hot: Record<string, unknown>[];
  episodic: Record<string, unknown>[];
  semantic: Record<string, unknown>[];
  failure: Record<string, unknown>[];
}

export class MemoryEngine {
  private userId: string;
  private hotMemory: Record<string, unknown>[] = []; // Tier 1: Current session

  constructor(userId: string) {
    this.userId = userId;
  }

  // --- TIER 1: HOT MEMORY ---
  addHotMemory(entry: Record<string, unknown>) {
    this.hotMemory.push(entry);
    if (this.hotMemory.length > 50) this.hotMemory.shift();
  }

  getHotMemory() {
    return this.hotMemory;
  }

  // --- TIER 2: EPISODIC MEMORY ---
  async getEpisodicMemory(limit: number = 5) {
    try {
      let query = supabase
        .from('user_memory')
        .select('*')
        .eq('user_id', this.userId)
        .eq('category', 'context')
        .order('updated_at', { ascending: false });
        
      if (limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err: unknown) {
      ObservabilityLogger.log('ERROR', 'MemoryEngine', 'Failed episodic fetch', err instanceof Error ? err.message : String(err));
      return [];
    }
  }

  // --- TIER 3: SEMANTIC MEMORY ---
  async getSemanticMemory(queryEmbedding: number[], matchCount: number = 5) {
    try {
      const { data, error } = await supabase.rpc('match_chunks', {
        query_embedding: queryEmbedding,
        match_user_id: this.userId,
        match_count: matchCount,
        match_threshold: 0.3
      });
      if (error) throw error;
      return data || [];
    } catch (err: unknown) {
      ObservabilityLogger.log('ERROR', 'MemoryEngine', 'Failed semantic fetch', err instanceof Error ? err.message : String(err));
      return [];
    }
  }

  // --- TIER 4: FAILURE MEMORY (CRITICAL FOR SELF-CORRECTION) ---
  async logFailure(mistakeType: string, context: string, fixStrategy: string) {
    try {
      const key = `mistake_${Date.now()}`;
      const value = JSON.stringify({ mistakeType, context, fixStrategy });
      const { error } = await supabase
        .from('user_memory')
        .upsert(
          { user_id: this.userId, key, value, category: 'failure', updated_at: new Date().toISOString() },
          { onConflict: 'user_id, key' }
        );
      if (error) throw error;
      ObservabilityLogger.log('INFO', 'MemoryEngine', 'Logged failure to Tier 4', { mistakeType });
    } catch (err: unknown) {
      ObservabilityLogger.log('ERROR', 'MemoryEngine', 'Failed to log failure memory', err instanceof Error ? err.message : String(err));
    }
  }

  async getFailureMemory(limit: number = 3) {
    try {
      let query = supabase
        .from('user_memory')
        .select('*')
        .eq('user_id', this.userId)
        .eq('category', 'failure')
        .order('updated_at', { ascending: false });

      if (limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err: unknown) {
      return [];
    }
  }

  // --- SYNTHESIS ---
  async compileContext(queryEmbedding?: number[], omniscienceMode: boolean = false): Promise<MemoryContext> {
    const episodicLimit = omniscienceMode ? 0 : 5; // 0 means no limit
    const failureLimit = omniscienceMode ? 0 : 3;

    const [episodic, failure] = await Promise.all([
      this.getEpisodicMemory(episodicLimit),
      this.getFailureMemory(failureLimit)
    ]);
    const semantic = queryEmbedding ? await this.getSemanticMemory(queryEmbedding) : [];

    return {
      hot: this.hotMemory,
      episodic,
      semantic,
      failure
    };
  }
}
