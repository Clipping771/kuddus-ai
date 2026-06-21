import { Tool } from './index';

export const searchWebTool: Tool = {
  name: 'searchWeb',
  description: 'Searches the web for the given query to find current information.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
    },
    required: ['query'],
  },
  execute: async (args: { query: string }) => {
    // Note: To make this production ready, integrate with Tavily API, Google Search API, or Serper.
    // Here we use a placeholder or check for an environment variable.
    const apiKey = process.env.TAVILY_API_KEY;
    
    if (!apiKey) {
      return `[MOCK SEARCH RESULT for "${args.query}"] 
To enable real web search, please add TAVILY_API_KEY to your environment variables. 
This is a simulated result because the system lacks internet access right now.`;
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: args.query,
          search_depth: 'basic',
          include_answer: true,
          max_results: 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search API error: ${response.statusText}`);
      }

      const data = await response.json();
      return `Answer: ${data.answer}\n\nResults:\n${data.results.map((r: any) => `- ${r.title}: ${r.content} (${r.url})`).join('\n')}`;
    } catch (err: any) {
      throw new Error(`Failed to search the web: ${err.message}`);
    }
  },
};
