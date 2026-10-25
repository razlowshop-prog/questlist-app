import assert from 'node:assert/strict';
import { test } from 'node:test';
import { legalDocs, missingDetails, OPERATOR, type Operator } from './legal.ts';

const full: Operator = { name: 'Max Muster', street: 'Hauptstraße 1', city: '1010 Wien', country: 'Austria', email: 'hello@example.com', authority: 'Magistrat der Stadt Wien', trade: 'IT-Dienstleistungen' };

test('there are terms, a privacy policy and an imprint, each with text', () => {
  const docs = legalDocs('Succedo', full);
  assert.deepEqual(docs.map((d) => d.id), ['terms', 'privacy', 'imprint']);
  for (const d of docs) {
    assert.ok(d.sections.length > 0);
    for (const s of d.sections) assert.ok(s.heading && s.paragraphs.every((p) => p.length > 0));
  }
});

test('with every detail filled in, nothing says "to be added"', () => {
  const text = JSON.stringify(legalDocs('Succedo', full));
  assert.ok(!text.includes('[to be added]'));
  assert.ok(text.includes('Max Muster, Hauptstraße 1, 1010 Wien, Austria'));
  assert.ok(text.includes('No VAT number'));
  assert.ok(JSON.stringify(legalDocs('Succedo', { ...full, vatId: 'ATU12345678' })).includes('ATU12345678'));
});

test('missing details are marked, and listed so the launch check catches them', () => {
  assert.ok(JSON.stringify(legalDocs('Succedo', OPERATOR)).includes('[to be added]'));
  assert.deepEqual(missingDetails(full), []);
  assert.deepEqual(missingDetails({ ...full, email: ' ' }), ['email']);
});

test('the texts keep the fairness promises', () => {
  const terms = legalDocs('Succedo', full)[0].sections.map((s) => s.paragraphs.join(' ')).join(' ');
  assert.match(terms, /never sold/);
  assert.match(terms, /never money or real prizes/);
  assert.match(terms, /cannot be bought, sold, traded/);
});
