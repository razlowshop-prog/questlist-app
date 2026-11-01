import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import ts from 'typescript';
import { DE } from './i18n.de.ts';
import { emptyState, shownName } from './game.ts';
import { lang, num, setLang, t, tn } from './i18n.ts';

const ROOT = new URL('..', import.meta.url).pathname;
// The developer page is only in test builds and stays English (devTools.ts).
const SOURCES = [
  'App.tsx',
  ...['src', 'src/screens', 'src/components', 'src/components/fx'].flatMap((dir) =>
    readdirSync(ROOT + dir)
      .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('.test.ts') && f !== 'i18n.de.ts' && f !== 'DevScreen.tsx')
      .map((f) => `${dir}/${f}`),
  ),
];

/** Texts that read the same in both languages, or aren't words. */
const SAME = /^(XP|×|·|\+|–|—|-|\/|\.|,|:|…|%|\s)*$|^[A-Z]{1,4}$|^Succedo$/;

/** Props that hold text a person reads. */
const TEXT_PROPS = new Set(['accessibilityLabel', 'accessibilityHint', 'placeholder', 'label', 'title', 'eyebrow', 'body', 'closeLabel', 'confirmLabel', 'cancelLabel', 'before', 'word', 'after', 'hint', 'sub', 'note']);

function scan() {
  const keys: { key: string; where: string }[] = [];
  const raw: string[] = [];
  for (const file of SOURCES) {
    const src = readFileSync(ROOT + file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const where = (n: ts.Node) => `${file}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
    const literal = (n: ts.Node | undefined) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : undefined);
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const name = n.expression.text;
        const args = name === 'tn' ? n.arguments.slice(1, 3) : name === 't' || name === 'N' ? n.arguments.slice(0, 1) : [];
        for (const a of args) {
          const text = literal(a);
          if (text !== undefined) keys.push({ key: text, where: where(a) });
        }
      }
      if (ts.isJsxText(n) && /[A-Za-z]{2}/.test(n.text) && !SAME.test(n.text.trim())) raw.push(`${where(n)} ${n.text.trim()}`);
      if (ts.isJsxAttribute(n) && TEXT_PROPS.has(n.name.getText(sf)) && n.initializer && ts.isStringLiteral(n.initializer)) {
        const text = n.initializer.text;
        if (/[A-Za-z]{2}/.test(text) && !SAME.test(text)) raw.push(`${where(n)} ${n.name.getText(sf)}="${text}"`);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return { keys, raw };
}

test('every English text has a German one', () => {
  const missing = [...new Set(scan().keys.filter(({ key }) => !(key in DE) && !SAME.test(key)).map(({ key, where }) => `${where} ${JSON.stringify(key)}`))];
  assert.deepEqual(missing, []);
});

test('every German entry is still used', () => {
  const used = new Set(scan().keys.map(({ key }) => key));
  assert.deepEqual(Object.keys(DE).filter((key) => !used.has(key)), []);
});

test('no screen text skips the translation', () => {
  assert.deepEqual(scan().raw, []);
});

test('German entries keep the placeholders of the English', () => {
  const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
  const wrong = Object.entries(DE).filter(([en, de]) => holes(en) !== holes(de)).map(([en]) => en);
  assert.deepEqual(wrong, []);
});

test('t, tn and num follow the language', () => {
  assert.equal(lang(), 'en');
  assert.equal(t('Every day'), 'Every day');
  assert.equal(tn(1, '{n} task', '{n} tasks'), '1 task');
  assert.equal(num(12000), '12,000');
  setLang('de');
  try {
    assert.equal(t('Every day'), 'Jeden Tag');
    assert.equal(t('{n}× a week', { n: 3 }), '3× pro Woche');
    assert.equal(num(12000), '12.000');
    assert.equal(t('Some text nobody translated'), 'Some text nobody translated');
  } finally {
    setLang('en');
  }
});

test('the placeholder name follows the language, a typed name never changes', () => {
  setLang('de');
  assert.equal(shownName(emptyState.profile.name), 'Spieler');
  assert.equal(shownName('Anna'), 'Anna');
  setLang('en');
  assert.equal(shownName(emptyState.profile.name), 'Player');
});

test('a "#one" key is never shown, and German gets its own singular', () => {
  setLang('en');
  assert.equal(tn(1, 'day streak#one', 'day streak'), 'day streak');
  assert.equal(tn(1, '{n}-day streak#one', '{n}-day streak'), '1-day streak');
  setLang('de');
  assert.equal(tn(1, 'day streak#one', 'day streak'), 'Tag in Folge');
  assert.equal(tn(4, 'day streak#one', 'day streak'), 'Tage in Folge');
  assert.equal(tn(1, '{n}-day streak#one', '{n}-day streak'), '1-Tages-Serie');
  setLang('en');
});
