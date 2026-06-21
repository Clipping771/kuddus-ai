export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any) => Promise<string>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsDescription(): string {
    return this.getAllTools()
      .map(t => `- ${t.name}: ${t.description}. Params: ${JSON.stringify(t.parameters)}`)
      .join('\n');
  }

  async executeTool(name: string, args: any): Promise<string> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    try {
      return await tool.execute(args);
    } catch (error: any) {
      return `Tool execution failed: ${error.message}`;
    }
  }
}
