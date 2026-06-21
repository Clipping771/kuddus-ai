/**
 * Intelligent Model Auto-Router
 * 
 * Maps a requested model to the best available alternative based on the
 * user's active API keys. Prevents hard failures when a user selects a model
 * but doesn't have the specific provider key.
 */

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter';

const TIER_1_HEAVY = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-pro',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'anthropic/claude-3.5-sonnet'
};

const TIER_2_FAST = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  gemini: 'gemini-1.5-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free'
};

const TIER_3_BASIC = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  gemini: 'gemini-1.5-flash',
  groq: 'llama-3.1-8b-instant',
  openrouter: 'google/gemma-2-9b-it:free'
};

/**
 * Identify which provider naturally serves this model.
 */
function getNativeProvider(modelId: string): Provider {
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1-') || modelId.startsWith('o3-')) return 'openai';
  if (modelId.startsWith('claude-')) return 'anthropic';
  if (modelId.startsWith('gemini-')) return 'gemini';
  
  // Llama models usually go to Groq if available, otherwise OpenRouter
  if (modelId.includes('llama') && !modelId.includes('/')) return 'groq';
  
  return 'openrouter';
}

/**
 * Determine the complexity tier of the requested model to find a peer equivalent.
 */
function getModelTier(modelId: string): 1 | 2 | 3 {
  // Tier 1
  if (
    (modelId.includes('gpt-4o') && !modelId.includes('mini')) ||
    modelId.includes('claude-3-5') || modelId.includes('claude-3-opus') ||
    modelId.includes('gemini-1.5-pro') ||
    modelId.includes('o1-') || modelId.includes('o3-') ||
    modelId.includes('405b')
  ) {
    return 1;
  }

  // Tier 2
  if (
    modelId.includes('gpt-4o-mini') ||
    modelId.includes('haiku') ||
    modelId.includes('gemini-1.5-flash') ||
    modelId.includes('70b') || modelId.includes('90b')
  ) {
    return 2;
  }

  // Default Tier 3
  return 3;
}

/**
 * Picks the best provider available in this preference order
 */
function selectBestAvailableProvider(activeProviders: Set<Provider>): Provider | null {
  if (activeProviders.has('gemini')) return 'gemini'; // Fast & Free/Cheap usually
  if (activeProviders.has('anthropic')) return 'anthropic';
  if (activeProviders.has('openai')) return 'openai';
  if (activeProviders.has('groq')) return 'groq';
  if (activeProviders.has('openrouter')) return 'openrouter';
  return null;
}

/**
 * Intelligently remap the requested model to an equivalent model from an ACTIVE provider.
 */
export function dynamicallyRouteModel(requestedModelId: string, activeProviders: Set<Provider>): string {
  // If no providers are active at all, just return the requested and let it naturally fail.
  if (activeProviders.size === 0) {
    return requestedModelId;
  }

  const nativeProvider = getNativeProvider(requestedModelId);

  // If the user HAS the native provider key, no remapping is needed.
  if (activeProviders.has(nativeProvider)) {
    // Exception: If they request a generic 'llama' without OpenRouter prefix but have OpenRouter, 
    // it will naturally fail if passed to Groq, so let's check it.
    if (nativeProvider === 'groq' && requestedModelId.includes('/')) {
      if (activeProviders.has('openrouter')) return requestedModelId; // It's actually an OR model
    }
    return requestedModelId; 
  }

  // Exception for OpenRouter: If it's an OpenRouter model ID but OpenRouter is dead/inactive, 
  // we must remap it. If OpenRouter IS active, we use it directly.
  if (requestedModelId.includes('/') && activeProviders.has('openrouter')) {
    return requestedModelId;
  }

  console.log(`[AutoRouter] 🔄 Native provider '${nativeProvider}' unavailable for '${requestedModelId}'. Finding equivalent...`);

  const tier = getModelTier(requestedModelId);
  const fallbackProvider = selectBestAvailableProvider(activeProviders);

  if (!fallbackProvider) {
    return requestedModelId; // Should never hit this due to size === 0 check above
  }

  let mappedModel = requestedModelId;
  if (tier === 1) mappedModel = TIER_1_HEAVY[fallbackProvider];
  else if (tier === 2) mappedModel = TIER_2_FAST[fallbackProvider];
  else mappedModel = TIER_3_BASIC[fallbackProvider];

  console.log(`[AutoRouter] ✅ Remapped to ${fallbackProvider}: '${mappedModel}' (Tier ${tier})`);
  return mappedModel;
}
