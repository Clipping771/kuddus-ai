import { Tool } from './index';
import * as fs from 'fs/promises';
import * as path from 'path';

export const readFileTool: Tool = {
  name: 'readFile',
  description: 'Reads the content of a file at the specified absolute path.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The absolute path to the file to read',
      },
    },
    required: ['path'],
  },
  execute: async (args: { path: string }) => {
    try {
      const content = await fs.readFile(args.path, 'utf-8');
      return content;
    } catch (err: any) {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  },
};

export const writeFileTool: Tool = {
  name: 'writeFile',
  description: 'Writes content to a file at the specified absolute path. Creates directories if they do not exist.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The absolute path to the file to write',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
    },
    required: ['path', 'content'],
  },
  execute: async (args: { path: string; content: string }) => {
    try {
      const dir = path.dirname(args.path);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(args.path, args.content, 'utf-8');
      return `Successfully wrote to ${args.path}`;
    } catch (err: any) {
      throw new Error(`Failed to write file: ${err.message}`);
    }
  },
};
