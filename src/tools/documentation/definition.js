export const docSearchToolDefinition = {
  name: 'doc_search',
  description: 'Busca artículos, especificaciones y guías de documentación por palabras clave o categorías.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Término o frase de búsqueda en la documentación.'
      },
      category: {
        type: 'string',
        description: 'Categoría opcional (e.g. "api", "guides", "architecture", "deployment").'
      },
      limit: {
        type: 'integer',
        description: 'Número máximo de resultados a retornar (por defecto 5, máximo 20).'
      }
    },
    required: ['query']
  }
};

export const docFetchToolDefinition = {
  name: 'doc_fetch',
  description: 'Obtiene el contenido completo, metadatos y secciones de un documento por su ID o ruta.',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Identificador único o ruta relativa del documento.'
      }
    },
    required: ['documentId']
  }
};
