import { Tool } from './index';
import CodeInterpreter from '@e2b/code-interpreter';

export const runCodeTool: Tool = {
  name: 'runCode',
  description: 'Executes Python or JavaScript code in a secure, isolated cloud sandbox environment.',
  parameters: {
    type: 'object',
    properties: {
      language: {
        type: 'string',
        enum: ['python', 'javascript'],
        description: 'The programming language of the code to execute.',
      },
      code: {
        type: 'string',
        description: 'The actual code to run.',
      },
    },
    required: ['language', 'code'],
  },
  execute: async (args: { language: string; code: string }) => {
    // Requires E2B_API_KEY environment variable to be set
    if (!process.env.E2B_API_KEY) {
      return `[ERROR]: E2B_API_KEY is not set. Cannot run code securely. Please configure your environment.`;
    }

    try {
      // Create a secure sandbox
      const sandbox = await CodeInterpreter.create();
      
      let result;
      if (args.language === 'python') {
        result = await sandbox.notebook.execCell(args.code);
      } else if (args.language === 'javascript') {
        // E2B code interpreter is natively Jupyter based (Python). 
        // For JS, we can use magic commands or write to a file and run node.
        const tempFile = '/tmp/script.js';
        await sandbox.filesystem.write(tempFile, args.code);
        const process = await sandbox.process.startAndWait(`node ${tempFile}`);
        
        return `stdout:\n${process.stdout}\nstderr:\n${process.stderr}`;
      } else {
        throw new Error('Unsupported language. Use python or javascript.');
      }

      // Close the sandbox to free resources
      await sandbox.close();

      if (args.language === 'python') {
        let output = '';
        if (result.text) output += `stdout:\n${result.text}\n`;
        if (result.error) output += `stderr:\n${result.error.name}: ${result.error.value}\n`;
        
        return output || 'Execution completed with no output.';
      }
      
      return 'Execution completed.';
    } catch (err: any) {
      return `[ERROR] Execution failed: ${err.message}`;
    }
  },
};
