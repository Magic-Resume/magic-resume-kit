import assert from 'node:assert/strict';
import test from 'node:test';
import { getPdfFontStack, getPdfRichTextFontFamily } from '../font-family';
import {
  collectPdfFontCharacters,
  FontProfileRegistry,
  resolvePdfFontProfile,
  type PdfFontProfile,
} from './fontAssets';
import type { Resume } from '../types/resume';
import type { MagicTemplateDSL } from '../types/magic-dsl';

const template = { components: {} } as MagicTemplateDSL;
const document = {
  name: 'Private metadata 秘',
  documentLanguage: 'en',
  info: { fullName: 'Alex Morgan', avatar: 'data:image/png;base64,不可发送' },
  sections: {
    summary: [
      { visible: true, summary: '<p>R&amp;D &#x4e2d;文 — café</p>' },
      { visible: false, summary: '龘' },
    ],
  },
  sectionOrder: [{ key: 'summary', label: '个人总结' }],
} as unknown as Resume;

test('font requests contain a stable character set, decoded HTML and localized labels', () => {
  const characters = collectPdfFontCharacters(document, template);
  for (const character of ['中', '文', 'é', '—', '&', 'A', 'z', '7', '•', '：']) {
    assert.ok(characters.includes(character), `missing ${character}`);
  }
  assert.ok(!characters.includes('秘'), 'document metadata is not rendered');
  assert.ok(!characters.includes('龘'), 'hidden sections are not rendered');
  assert.ok(!characters.includes('发'), 'avatar bytes must not enter font requests');
  assert.ok(!characters.includes('总'), 'default labels follow the document language');
  assert.equal(characters, [...new Set(characters)].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join(''));
  assert.ok(!characters.includes('Alex Morgan'), 'font requests do not contain ordered resume text');
});

test('font character collection includes custom template text and astral characters', () => {
  const characters = collectPdfFontCharacters({
    ...document,
    templateOverride: { title: '𠮷', image: { src: 'data:image/png;base64,忽略' } },
    sectionOrder: [{ key: 'custom', label: '作品' }],
  } as unknown as Resume, template);
  assert.ok(characters.includes('𠮷'));
  assert.ok(characters.includes('作'));
  assert.ok(!characters.includes('忽'));
});

test('shared source files are resolved once and all PDF font references use the same aliases', async () => {
  const calls: string[] = [];
  const resolver = async (source: string, characters: string) => {
    calls.push(source);
    assert.equal(characters, 'ABC');
    return `data:font/woff2;base64,${source.endsWith('bold') ? 'Ym9sZA==' : 'cmVndWxhcg=='}`;
  };
  const profile = await resolvePdfFontProfile([
    { family: 'Source Han Serif SC', source: 'https://example.com/regular' },
    { family: 'Source Han Serif SC', source: 'https://example.com/bold' },
    { family: 'Faux Bold', source: 'https://example.com/regular' },
  ], 'ABC', resolver);
  assert.ok(profile);
  assert.equal(calls.length, 2);
  assert.notEqual(profile.families['Source Han Serif SC'], 'Source Han Serif SC');
  assert.equal(getPdfFontStack('serif', false, profile.families)[0], profile.families['Source Han Serif SC']);
  assert.equal(getPdfRichTextFontFamily('serif', false, profile.families), profile.families['Source Han Serif SC']);
  assert.equal(profile.sources.get('https://example.com/regular'), 'data:font/woff2;base64,cmVndWxhcg==');
});

test('concurrent renders reuse the same in-flight font preparation', async () => {
  let calls = 0;
  let finish!: (value: string) => void;
  const resolver = async () => {
    calls += 1;
    return new Promise<string>(resolve => { finish = resolve; });
  };
  const fonts = [{ family: 'Source Han Sans SC', source: 'https://example.com/regular' }];
  const first = resolvePdfFontProfile(fonts, 'ABC', resolver);
  const second = resolvePdfFontProfile(fonts, 'ABC', resolver);
  await Promise.resolve();
  finish('data:font/woff2;base64,Zm9udA==');
  assert.equal(await first, await second);
  assert.equal(calls, 1);
});

test('a failed font service falls back to the existing source and can recover', async () => {
  let available = false;
  const resolver = async () => {
    if (!available) throw new Error('unavailable');
    return 'data:font/woff2;base64,Zm9udA==';
  };
  const fonts = [{ family: 'Source Han Sans SC', source: 'https://example.com/regular' }];
  assert.equal(await resolvePdfFontProfile(fonts, 'ABC', resolver), undefined);
  available = true;
  assert.ok(await resolvePdfFontProfile(fonts, 'ABC', resolver));
});

const profile = (id: string): PdfFontProfile => ({
  id,
  families: { Base: `Base ${id}` },
  sources: new Map(),
});

test('font profile eviction never removes a font used by an in-flight render', () => {
  const disposed: string[] = [];
  const registry = new FontProfileRegistry(1, value => disposed.push(value.id));
  const first = registry.retain(profile('one'));
  const second = registry.retain(profile('two'));
  assert.deepEqual(disposed, []);
  first();
  assert.deepEqual(disposed, ['one']);
  second();
  second();
  const third = registry.retain(profile('three'));
  assert.deepEqual(disposed, ['one', 'two']);
  third();
});
