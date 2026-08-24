import { describe, it, expect } from 'vitest';
import { generateIntegrationSnippet } from '../../../src/utils/codeGenerator.js';

describe('Code Generator Utility', () => {
  const sampleEndpoint = {
    method: 'POST',
    path: '/members/{memberId}/points/accrue',
    operationId: 'accruePoints',
    summary: 'Acumulación de puntos Doters',
    parameters: [
      {
        name: 'memberId',
        in: 'path',
        required: true,
        description: 'ID de membresía',
        schema: { type: 'string', example: 'DOT-123' }
      },
      {
        name: 'notify',
        in: 'query',
        required: false,
        description: 'Notificar por email',
        schema: { type: 'boolean' }
      },
      {
        name: 'count',
        in: 'query',
        required: true,
        schema: { type: 'integer' }
      }
    ],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['amountSpent', 'partnerId'],
            properties: {
              amountSpent: { type: 'number', example: 1500.00 },
              partnerId: { type: 'string', example: 'VIVA-MX' },
              contactEmail: { type: 'string', format: 'email' },
              transactionDate: { type: 'string', format: 'date-time' },
              bookingDate: { type: 'string', format: 'date' },
              statusEnum: { type: 'string', enum: ['ACTIVE', 'PENDING'] },
              tags: { type: 'array', items: { type: 'string' } },
              metadata: {
                type: 'object',
                properties: {
                  clientVer: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  };

  it('generates TypeScript fetch snippet with typed interfaces', () => {
    const code = generateIntegrationSnippet({
      endpoint: sampleEndpoint,
      baseUrl: 'https://api.doters.com',
      language: 'typescript',
      clientType: 'fetch'
    });

    expect(code).toContain('export interface AccruePointsParams');
    expect(code).toContain('export interface AccruePointsPayload');
    expect(code).toContain('export async function accruePoints(');
    expect(code).toContain('fetch(url.toString()');
    expect(code).toContain('https://api.doters.com/members/${params.memberId}/points/accrue');
  });

  it('generates TypeScript axios snippet when clientType is axios', () => {
    const code = generateIntegrationSnippet({
      endpoint: sampleEndpoint,
      baseUrl: 'https://api.doters.com',
      language: 'typescript',
      clientType: 'axios'
    });

    expect(code).toContain("import axios from 'axios';");
    expect(code).toContain('await axios({');
    expect(code).toContain("method: 'POST'");
  });

  it('generates JavaScript snippet with modern fetch', () => {
    const code = generateIntegrationSnippet({
      endpoint: sampleEndpoint,
      baseUrl: 'https://api.doters.com',
      language: 'javascript'
    });

    expect(code).toContain('export async function accruePoints(');
    expect(code).toContain('fetch(url.toString()');
    expect(code).toContain("method: 'POST'");
  });

  it('generates Python snippet with httpx async client', () => {
    const code = generateIntegrationSnippet({
      endpoint: sampleEndpoint,
      baseUrl: 'https://api.doters.com',
      language: 'python'
    });

    expect(code).toContain('import httpx');
    expect(code).toContain('async def accrue_points(');
    expect(code).toContain('async with httpx.AsyncClient() as client:');
    expect(code).toContain('method="POST"');
  });

  it('generates cURL command snippet with headers and JSON body', () => {
    const code = generateIntegrationSnippet({
      endpoint: sampleEndpoint,
      baseUrl: 'https://api.doters.com',
      language: 'curl'
    });

    expect(code).toContain('curl -X POST');
    expect(code).toContain('https://api.doters.com/members/DOT-123/points/accrue');
    expect(code).toContain('-H "Content-Type: application/json"');
    expect(code).toContain('amountSpent');
    expect(code).toContain('user@example.com');
  });

  it('generates C# HttpClient snippet', () => {
    const code = generateIntegrationSnippet({
      endpoint: sampleEndpoint,
      baseUrl: 'https://api.doters.com',
      language: 'csharp'
    });

    expect(code).toContain('public class AccruePointsClient');
    expect(code).toContain('public async Task<string> ExecuteAsync(');
    expect(code).toContain('JsonSerializer.Serialize(payload)');
  });

  it('handles endpoints without operationId, summary, parameters or requestBody gracefully', () => {
    const minimalEndpoint = {
      method: 'GET',
      path: '/health'
    };

    const tsCode = generateIntegrationSnippet({
      endpoint: minimalEndpoint,
      language: 'ts'
    });
    expect(tsCode).toContain('export async function get_api_call(');

    const pyCode = generateIntegrationSnippet({
      endpoint: minimalEndpoint,
      language: 'python'
    });
    expect(pyCode).toContain('async def get_api_call(');

    const curlCode = generateIntegrationSnippet({
      endpoint: minimalEndpoint,
      language: 'curl'
    });
    expect(curlCode).toContain('curl -X GET');

    const unknownLangCode = generateIntegrationSnippet({
      endpoint: minimalEndpoint,
      language: 'unsupported-lang'
    });
    expect(unknownLangCode).toContain('export async function get_api_call(');
  });
});
