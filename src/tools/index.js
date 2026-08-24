import { docSearchToolDefinition, docFetchToolDefinition } from './documentation/definition.js';
import { docSearchHandler, docFetchHandler } from './documentation/handler.js';

export const tools = [
  {
    definition: docSearchToolDefinition,
    handler: docSearchHandler
  },
  {
    definition: docFetchToolDefinition,
    handler: docFetchHandler
  }
];
