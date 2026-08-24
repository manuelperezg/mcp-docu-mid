import {
  listSpecsToolDefinition,
  searchDocsToolDefinition,
  getEndpointDocToolDefinition,
  getSchemaDocToolDefinition,
  generateIntegrationCodeToolDefinition,
  getSecuritySchemesToolDefinition,
  validatePayloadToolDefinition,
  queryApiKnowledgeToolDefinition
} from './documentation/definition.js';

import {
  listSpecsHandler,
  searchDocsHandler,
  getEndpointDocHandler,
  getSchemaDocHandler,
  generateIntegrationCodeHandler,
  getSecuritySchemesHandler,
  validatePayloadHandler,
  queryApiKnowledgeHandler
} from './documentation/handler.js';

export const tools = [
  {
    definition: listSpecsToolDefinition,
    handler: listSpecsHandler
  },
  {
    definition: searchDocsToolDefinition,
    handler: searchDocsHandler
  },
  {
    definition: getEndpointDocToolDefinition,
    handler: getEndpointDocHandler
  },
  {
    definition: getSchemaDocToolDefinition,
    handler: getSchemaDocHandler
  },
  {
    definition: generateIntegrationCodeToolDefinition,
    handler: generateIntegrationCodeHandler
  },
  {
    definition: getSecuritySchemesToolDefinition,
    handler: getSecuritySchemesHandler
  },
  {
    definition: validatePayloadToolDefinition,
    handler: validatePayloadHandler
  },
  {
    definition: queryApiKnowledgeToolDefinition,
    handler: queryApiKnowledgeHandler
  }
];
