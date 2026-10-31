import { documentLabel, documentSectionTitle, normalizeDocumentLanguage, resolveDocumentLanguage } from '@magic-resume-kit/resume-schema';
import { parse } from 'node-html-parser';
import { resolveSectionTitle } from '../sectionSemantics';
import type { MagicTemplateDSL } from '../types/magic-dsl';
import type { Resume } from '../types/resume';

/** Optional host adapter. Return a font URL/data URL with the original glyph metrics. */
export type PdfFontResolver = (source: string, characters: string) => Promise<string>;
export type PdfFontFamilies = Readonly<Record<string, string>>;

export interface PdfFontProfile {
  id: string;
  families: PdfFontFamilies;
  sources: Map<string, string>;
}

// Include renderer-generated numbers, list markers, date separators and localized punctuation.
const BASE_CHARACTERS = Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32)).join('')
  + '\u00a0·•◦▪–—‘’“”…｜：';

export function collectPdfFontCharacters(data: Resume, template: MagicTemplateDSL, requestedLocale?: string): string {
  const characters = new Set(BASE_CHARACTERS);
  const collect = (value: unknown, key?: string): void => {
    if (typeof value === 'string') {
      if (key === 'avatar' || key === 'src' || /^data:/i.test(value)) return;
      const html = /<(?:p|div|span|strong|em|i|b|u|a|ul|ol|li|br)\b/i.test(value) ? value : value.replaceAll('<', '&lt;');
      for (const character of parse(html).text) characters.add(character);
    } else if (Array.isArray(value)) {
      value.forEach(item => collect(item));
    } else if (value && typeof value === 'object') {
      const object = value as Record<string, unknown>;
      if (object.visible === false || object.visible === 'false' || object.visible === 0) return;
      for (const [entryKey, entryValue] of Object.entries(object)) collect(entryValue, entryKey);
    }
  };
  collect(data.info);
  collect(data.sections);
  collect(data.templateOverride);
  collect(template.components);
  const locale = normalizeDocumentLanguage(data.documentLanguage)
    ?? normalizeDocumentLanguage(requestedLocale) ?? resolveDocumentLanguage(data);
  for (const key of ['phone', 'email', 'address', 'website', 'yourName', 'avatar'] as const) collect(documentLabel(key, locale));
  for (const key of Object.keys(data.sections ?? {})) collect(documentSectionTitle(key, locale));
  for (const entry of data.sectionOrder ?? []) {
    collect(resolveSectionTitle(entry.key, entry.label ?? entry.key, data, locale));
  }
  return [...characters].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join('');
}

const profiles = new WeakMap<PdfFontResolver, Map<string, Promise<PdfFontProfile | undefined>>>();
let nextProfileId = 0;

export function resolvePdfFontProfile(
  fonts: Array<{ family: string; source: string }>,
  characters: string,
  resolver: PdfFontResolver,
): Promise<PdfFontProfile | undefined> {
  let cache = profiles.get(resolver);
  if (!cache) {
    cache = new Map();
    profiles.set(resolver, cache);
  }
  const key = JSON.stringify([fonts, characters]);
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    try {
      const sources = new Map(await Promise.all([...new Set(fonts.map(font => font.source))]
        .map(async source => [source, await resolver(source, characters)] as const)));
      if ([...sources.values()].some(source => !source)) throw new Error('Empty font source');
      const id = String(++nextProfileId);
      const families = Object.fromEntries(fonts.map(font => [font.family, `${font.family} Subset ${id}`]));
      return { id, families, sources };
    } catch {
      // A host optimization must not make PDF export unavailable; retry on the next render.
      cache!.delete(key);
      return undefined;
    }
  })();
  cache.set(key, promise);
  while (cache.size > 8) cache.delete(cache.keys().next().value!);
  return promise;
}

/** Retain active renders before evicting old, separately registered font families. */
export class FontProfileRegistry {
  private entries = new Map<string, { profile: PdfFontProfile; users: number }>();
  constructor(private readonly limit: number, private readonly dispose: (profile: PdfFontProfile) => void) {}

  retain(profile: PdfFontProfile): () => void {
    const entry = this.entries.get(profile.id) ?? { profile, users: 0 };
    entry.users += 1;
    this.entries.delete(profile.id);
    this.entries.set(profile.id, entry);
    this.evict();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      entry.users -= 1;
      this.evict();
    };
  }

  private evict(): void {
    for (const [id, entry] of this.entries) {
      if (this.entries.size <= this.limit) break;
      if (entry.users > 0) continue;
      this.entries.delete(id);
      this.dispose(entry.profile);
    }
  }
}
