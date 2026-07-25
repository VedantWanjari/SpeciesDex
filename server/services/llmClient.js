import { env, llmIsConfigured } from '../config/env.js';
import { fetchWithTimeout } from './http.js';

export async function requestLlmJson({ messages, label }) {
  if (!llmIsConfigured()) throw new Error('LLM is not configured');
  const startedAt = Date.now();
  const response = await fetchWithTimeout(env.llmApiBaseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.llmApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.llmModel,
      temperature: 0.35,
      messages,
      response_format: { type: 'json_object' }
    })
  });
  const elapsed = Date.now() - startedAt;
  if (!response.ok) {
    console.warn(`[${label}] LLM failed in ${elapsed}ms (${response.status})`);
    throw new Error(`LLM request failed (${response.status})`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  console.log(`[${label}] LLM succeeded in ${elapsed}ms`);
  if (!content) throw new Error('LLM returned an empty response');
  return typeof content === 'string' ? JSON.parse(content) : content;
}

