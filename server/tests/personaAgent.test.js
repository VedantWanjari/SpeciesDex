import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePersonaOutput } from '../agents/personaAgent.js';

const validPersona = {
  cardName: 'Mosswing Scout',
  tagline: 'A quiet champion of the canopy.',
  backstory: 'A tiny explorer that turns every leaf into an expedition.',
  specialMove: 'Canopy Dash'
};

test('persona validator accepts schema-compliant original content', () => {
  assert.equal(validatePersonaOutput(validPersona), null);
});

test('persona validator rejects blocked character names', () => {
  assert.match(validatePersonaOutput({ ...validPersona, cardName: 'Batman Bee' }), /blocked content/);
});
