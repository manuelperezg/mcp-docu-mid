function buildSampleValue(propSchema) {
  if (!propSchema) return 'sample_value';
  if (propSchema.example !== undefined) return propSchema.example;
  if (propSchema.enum && propSchema.enum.length > 0) return propSchema.enum[0];

  switch (propSchema.type) {
    case 'string':
      if (propSchema.format === 'email') return 'user@example.com';
      if (propSchema.format === 'date-time') return new Date().toISOString();
      if (propSchema.format === 'date') return '2026-09-15';
      return 'sample_string';
    case 'number':
    case 'integer':
      return 100;
    case 'boolean':
      return true;
    case 'array':
      return [buildSampleValue(propSchema.items)];
    case 'object':
      if (propSchema.properties) {
        const obj = {};
        for (const [k, v] of Object.entries(propSchema.properties)) {
          obj[k] = buildSampleValue(v);
        }
        return obj;
      }
      return {};
    default:
      return 'value';
  }
}

function extractRequestBodySample(requestBody) {
  if (!requestBody) return null;
  const content = requestBody.content || {};
  const jsonContent = content['application/json'];
  if (!jsonContent || !jsonContent.schema) return null;

  const schema = jsonContent.schema;
  if (schema.properties) {
    const sample = {};
    for (const [propName, propDef] of Object.entries(schema.properties)) {
      sample[propName] = buildSampleValue(propDef);
    }
    return sample;
  }
  return buildSampleValue(schema);
}

export function generateIntegrationSnippet({
  endpoint,
  baseUrl = 'https://api.example.com',
  language = 'typescript',
  clientType = 'fetch'
}) {
  const method = (endpoint.method || 'GET').toUpperCase();
  const path = endpoint.path || '/';
  const operationId = endpoint.operationId || `${method.toLowerCase()}_api_call`;
  const summary = endpoint.summary || `Llamada a ${method} ${path}`;
  const parameters = endpoint.parameters || [];
  const requestBodySample = extractRequestBodySample(endpoint.requestBody);

  const pathParams = parameters.filter(p => p.in === 'path');
  const queryParams = parameters.filter(p => p.in === 'query');
  const headerParams = parameters.filter(p => p.in === 'header');

  const lang = (language || 'typescript').toLowerCase();

  switch (lang) {
    case 'typescript':
    case 'ts':
      return generateTypeScriptSnippet({
        method,
        path,
        baseUrl,
        operationId,
        summary,
        pathParams,
        queryParams,
        headerParams,
        requestBodySample,
        clientType
      });

    case 'javascript':
    case 'js':
      return generateJavaScriptSnippet({
        method,
        path,
        baseUrl,
        operationId,
        summary,
        pathParams,
        queryParams,
        headerParams,
        requestBodySample
      });

    case 'python':
    case 'py':
      return generatePythonSnippet({
        method,
        path,
        baseUrl,
        operationId,
        summary,
        pathParams,
        queryParams,
        headerParams,
        requestBodySample
      });

    case 'curl':
    case 'bash':
      return generateCurlSnippet({
        method,
        path,
        baseUrl,
        summary,
        pathParams,
        queryParams,
        headerParams,
        requestBodySample
      });

    case 'csharp':
    case 'cs':
      return generateCSharpSnippet({
        method,
        path,
        baseUrl,
        operationId,
        summary,
        pathParams,
        queryParams,
        headerParams,
        requestBodySample
      });

    default:
      return generateTypeScriptSnippet({
        method,
        path,
        baseUrl,
        operationId,
        summary,
        pathParams,
        queryParams,
        headerParams,
        requestBodySample,
        clientType
      });
  }
}

function generateTypeScriptSnippet({ method, path, baseUrl, operationId, summary, pathParams, queryParams, headerParams, requestBodySample, clientType }) {
  let urlExpr = `\`${baseUrl}${path}\``;
  for (const p of pathParams) {
    urlExpr = urlExpr.replace(`{${p.name}}`, `\${params.${p.name}}`);
  }

  const hasBody = Boolean(requestBodySample && ['POST', 'PUT', 'PATCH'].includes(method));
  const isAxios = clientType?.toLowerCase() === 'axios';

  return `/**
 * ${summary}
 * Method: ${method} ${path}
 */
${isAxios ? `import axios from 'axios';` : ''}

export interface ${capitalize(operationId)}Params {
${pathParams.map(p => `  ${p.name}: ${p.schema?.type === 'integer' || p.schema?.type === 'number' ? 'number' : 'string'}; // ${p.description || p.name}`).join('\n')}
${queryParams.map(p => `  ${p.name}${p.required ? '' : '?'}: ${p.schema?.type === 'integer' || p.schema?.type === 'number' ? 'number' : 'string'}; // ${p.description || p.name}`).join('\n')}
}

${hasBody ? `export interface ${capitalize(operationId)}Payload {
${Object.keys(requestBodySample).map(k => `  ${k}: any;`).join('\n')}
}` : ''}

export async function ${operationId}(
  ${pathParams.length || queryParams.length ? `params: ${capitalize(operationId)}Params,` : ''}
  ${hasBody ? `payload: ${capitalize(operationId)}Payload,` : ''}
  token?: string
) {
  const url = new URL(${urlExpr});
${queryParams.map(q => `  if (params.${q.name} !== undefined) url.searchParams.append('${q.name}', String(params.${q.name}));`).join('\n')}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': \`Bearer \${token}\` } : {})
  };

  ${isAxios ? `const response = await axios({
    method: '${method}',
    url: url.toString(),
    headers,
    ${hasBody ? `data: payload,` : ''}
  });
  return response.data;` : `const response = await fetch(url.toString(), {
    method: '${method}',
    headers,
    ${hasBody ? `body: JSON.stringify(payload)` : ''}
  });

  if (!response.ok) {
    throw new Error(\`Error en ${operationId} (\${response.status}): \${await response.text()}\`);
  }

  return await response.json();`}
}
`;
}

function generateJavaScriptSnippet({ method, path, baseUrl, operationId, summary, pathParams, queryParams, requestBodySample }) {
  let urlExpr = `\`${baseUrl}${path}\``;
  for (const p of pathParams) {
    urlExpr = urlExpr.replace(`{${p.name}}`, `\${params.${p.name}}`);
  }
  const hasBody = Boolean(requestBodySample && ['POST', 'PUT', 'PATCH'].includes(method));

  return `/**
 * ${summary}
 * ${method} ${path}
 */
export async function ${operationId}({ params = {}, ${hasBody ? 'payload = {}, ' : ''}token = null } = {}) {
  const url = new URL(${urlExpr});
${queryParams.map(q => `  if (params.${q.name}) url.searchParams.append('${q.name}', params.${q.name});`).join('\n')}

  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = \`Bearer \${token}\`;
  }

  const response = await fetch(url.toString(), {
    method: '${method}',
    headers,
    ${hasBody ? `body: JSON.stringify(payload)` : ''}
  });

  if (!response.ok) {
    throw new Error(\`HTTP Error \${response.status}: \${await response.text()}\`);
  }

  return await response.json();
}
`;
}

function generatePythonSnippet({ method, path, baseUrl, operationId, summary, pathParams, queryParams, requestBodySample }) {
  let urlExpr = `f"${baseUrl}${path}"`;
  for (const p of pathParams) {
    urlExpr = urlExpr.replace(`{${p.name}}`, `{${p.name}}`);
  }
  const hasBody = Boolean(requestBodySample && ['POST', 'PUT', 'PATCH'].includes(method));

  return `import httpx
from typing import Optional, Dict, Any

async def ${snakeCase(operationId)}(
    ${pathParams.map(p => `${snakeCase(p.name)}: str,`).join('\n    ')}
    ${queryParams.map(p => `${snakeCase(p.name)}: Optional[str] = None,`).join('\n    ')}
    ${hasBody ? `payload: Optional[Dict[str, Any]] = None,` : ''}
    token: Optional[str] = None
) -> Dict[str, Any]:
    """
    ${summary}
    ${method} ${path}
    """
    url = ${urlExpr}
    params = {
${queryParams.map(p => `        "${p.name}": ${snakeCase(p.name)},`).join('\n')}
    }
    # Filtrar query params nulos
    params = {k: v for k, v in params.items() if v is not None}

    headers = {
        "Content-Type": "application/json"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient() as client:
        response = await client.request(
            method="${method}",
            url=url,
            params=params,
            headers=headers,
            ${hasBody ? `json=payload` : ''}
        )
        response.raise_for_status()
        return response.json()
`;
}

function generateCurlSnippet({ method, path, baseUrl, summary, pathParams, queryParams, headerParams, requestBodySample }) {
  let url = `${baseUrl}${path}`;
  for (const p of pathParams) {
    url = url.replace(`{${p.name}}`, String(p.schema?.example || '123'));
  }
  if (queryParams.length > 0) {
    const qStr = queryParams.map(q => `${q.name}=${encodeURIComponent(q.schema?.example || 'val')}`).join('&');
    url = `${url}?${qStr}`;
  }
  const hasBody = Boolean(requestBodySample && ['POST', 'PUT', 'PATCH'].includes(method));

  return `# ${summary}
curl -X ${method} "${url}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"${hasBody ? ` \\
  -d '${JSON.stringify(requestBodySample, null, 2)}'` : ''}
`;
}

function generateCSharpSnippet({ method, path, baseUrl, operationId, summary, pathParams, queryParams, requestBodySample }) {
  const className = capitalize(operationId) + 'Client';
  const hasBody = Boolean(requestBodySample && ['POST', 'PUT', 'PATCH'].includes(method));

  return `using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace ApiIntegration
{
    /// <summary>
    /// ${summary}
    /// ${method} ${path}
    /// </summary>
    public class ${className}
    {
        private readonly HttpClient _httpClient;

        public ${className}(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<string> ExecuteAsync(${hasBody ? 'object payload, ' : ''}string token = null)
        {
            var url = "${baseUrl}${path}";
            var request = new HttpRequestMessage(HttpMethod.${capitalize(method.toLowerCase())}, url);

            if (!string.IsNullOrEmpty(token))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }

            ${hasBody ? `var json = JsonSerializer.Serialize(payload);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");` : ''}

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }
    }
}
`;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function snakeCase(str) {
  if (!str) return '';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}
