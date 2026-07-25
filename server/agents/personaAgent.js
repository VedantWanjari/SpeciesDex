import Ajv from 'ajv';
import { llmIsConfigured } from '../config/env.js';
import { requestLlmJson } from '../services/llmClient.js';

const personaSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cardName', 'tagline', 'backstory', 'specialMove'],
  properties: {
    cardName: { type: 'string', maxLength: 30 },
    tagline: { type: 'string', maxLength: 60 },
    backstory: { type: 'string', maxLength: 280 },
    specialMove: { type: 'string', maxLength: 40 }
  }
};

const validatePersona = new Ajv({ allErrors: true }).compile(personaSchema);
const UNSAFE_TERMS = ['fuck', 'shit', 'bitch', 'asshole', 'donald trump', 'taylor swift', 'batman', 'pokemon', 'pikachu', 'harry potter', 'mickey mouse', 'marvel'];

function contentProblem(persona) {
  const text = Object.values(persona).join(' ').toLowerCase();
  const hit = UNSAFE_TERMS.find((term) => text.includes(term));
  return hit ? `blocked content: ${hit}` : null;
}

export function validatePersonaOutput(persona) {
  if (!validatePersona(persona)) return validatePersona.errors?.map((error) => `${error.instancePath || 'persona'} ${error.message}`).join('; ') || 'schema validation failed';
  return contentProblem(persona);
}

export function fallbackPersona({ scientificName, commonName, kingdom }) {
  const displayName = (commonName || scientificName || 'Field Specimen').replace(/[^a-zA-Z\s-]/g, '').trim().slice(0, 20) || 'Field Specimen';
  const role = String(kingdom).toLowerCase().includes('plant') ? 'Warden' : 'Prowler';
  return {
    cardName: `The ${displayName} ${role}`.slice(0, 30),
    tagline: `Field guide legend of ${displayName}`.slice(0, 60),
    backstory: `A quiet guardian of its habitat, this ${displayName} turns everyday survival into a spectacular field-guide adventure.`.slice(0, 280),
    specialMove: 'Nature’s Calling'
  };
}

/** JSON-schema and lightweight content safety gate. At most two corrective retries. */
export async function createPersona(species) {
  if (!llmIsConfigured()) {
    console.warn('[persona-agent] LLM unavailable; safe template fallback used');
    return { persona: fallbackPersona(species), source: 'fallback' };
  }
  let correction = '';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const output = await requestLlmJson({
        label: 'persona-agent',
        messages: [
          { role: 'system', content: 'Create one PG-rated original comic trading-card persona for a wildlife species. Return ONLY JSON with exactly: cardName (string max 30, no brands/people), tagline (string max 60), backstory (string max 280, no violence beyond cartoonish), specialMove (string max 40). Do not use copyrighted characters or public figures.' },
          { role: 'user', content: `Species: ${species.scientificName}; common name: ${species.commonName || 'unknown'}; kingdom: ${species.kingdom}.${correction}` }
        ]
      });
      const problem = validatePersonaOutput(output);
      if (!problem) return { persona: output, source: 'llm' };
      console.warn(`[persona-agent] validation failure on attempt ${attempt + 1}: ${problem}`);
      correction = ` Previous output failed because ${problem}. Fix it and return valid JSON only.`;
    } catch (error) {
      console.warn(`[persona-agent] request failure on attempt ${attempt + 1}: ${error.message}`);
      correction = ' Previous output could not be accepted. Return valid JSON only.';
    }
  }
  console.warn('[persona-agent] retry limit reached; safe template fallback used');
  return { persona: fallbackPersona(species), source: 'fallback' };
}
