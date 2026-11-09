import type { MagicTemplateDSL } from '../types/magic-dsl';
import { getFieldEntry } from '../fieldAccess';

export type DesignTokens = MagicTemplateDSL['designTokens'];
export type PresentationStyle = Record<string, string | number>;

/** Optional presentation of the existing Header and DefaultSection components. */
export interface CompactPresentationProps {
  presentation?: 'compact';
  itemLayout?: 'inline' | 'band' | 'split' | 'body';
  /** Ordered source fields for the title URL; independent of visual layout. */
  titleLinkField?: string | string[];
  technologyField?: string | string[];
  technologyLabel?: string;
  groupsField?: string;
  groupTitleColor?: string;
  fieldStyles?: Record<string, 'body' | 'title' | 'muted' | 'date' | 'accent' | 'strong'>;
  separator?: string;
  fieldGap?: number;
  listMarkerAlignment?: 'center' | 'first-line';
  designTokens?: DesignTokens;
}

const pixels = (value: string | undefined, fallback: number): number => {
  const match = value?.trim().match(/^(-?\d+(?:\.\d+)?)(px|pt|rem|em|mm)?$/);
  if (!match) return fallback;
  // Preserve the former tree's 16px em/rem base and 96dpi physical units.
  // Both backends consume pixels here; only the PDF boundary converts to points.
  const scale = { px: 1, pt: 4 / 3, rem: 16, em: 16, mm: 96 / 25.4 };
  return Number(match[1]) * (scale[match[2] as keyof typeof scale] ?? 1);
};

/** CSS pixel metrics shared by both backends; the PDF boundary converts lengths. */
export function compactPresentationStyles(tokens?: DesignTokens): Record<string, PresentationStyle> {
  const colors = tokens?.colors;
  const font = tokens?.typography;
  const body = pixels(font?.fontSize.sm, 13.3);
  return {
    body: { color: colors?.text ?? '#20252b', fontSize: body, lineHeight: font?.lineHeight ?? 1.3, letterSpacing: pixels(font?.letterSpacing, 0) },
    strong: { fontWeight: 700 },
    section: { gap: pixels(tokens?.spacing.sm, 5) },
    items: { gap: pixels(tokens?.spacing.md, 7) },
    item: { gap: pixels(tokens?.spacing.xs, 6) },
    heading: { paddingBottom: 3, borderBottomWidth: 1.5, borderStyle: 'solid', borderColor: colors?.primary ?? '#2458b8' },
    headingText: { color: colors?.primary ?? '#2458b8', fontSize: pixels(font?.fontSize.lg, 18), fontWeight: 700, lineHeight: 1.25 },
    row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
    title: { color: colors?.secondary ?? '#292929', fontSize: pixels(font?.fontSize.md, 14), fontWeight: 700, lineHeight: 1.35, textDecoration: 'none' },
    muted: { color: colors?.textSecondary ?? '#20252b' },
    accent: { color: colors?.primary ?? '#2458b8' },
    date: { color: colors?.textSecondary ?? '#20252b', fontSize: pixels(font?.fontSize.xs, 12), fontWeight: 400, flexShrink: 0 },
    band: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: 12, backgroundColor: '#f2f3f5', borderRadius: 2, paddingTop: 5, paddingBottom: 5, paddingLeft: 7, paddingRight: 7 },
    groupTitle: { fontSize: pixels(font?.fontSize.md, 14), fontWeight: 700, lineHeight: 1.35, marginTop: 7, marginBottom: 3 },
    header: { gap: pixels(tokens?.spacing.xl, 12) },
    role: { color: '#080808', fontSize: pixels(font?.fontSize.xxl, 25), fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.5 },
    contacts: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: pixels(tokens?.spacing.lg, 20), fontSize: 13, lineHeight: 1.6 },
    contact: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1, minWidth: 0, width: '100%' },
    contactText: { color: colors?.textSecondary ?? '#20252b', textDecoration: 'none', fontSize: 13, lineHeight: 1.6, flexShrink: 1, minWidth: 0, maxWidth: '100%' },
    contactValue: { flexBasis: 0, flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: '100%' },
    contactIcon: { marginTop: -6, flexShrink: 0 },
  };
}

export function compactFields(item: Record<string, unknown>, fieldMap: Record<string, string | string[] | undefined>, slots: string[]) {
  return slots.flatMap((slot) => {
    const entry = getFieldEntry(item, fieldMap[slot]);
    return entry ? [{ slot, ...entry }] : [];
  });
}

export function compactGroups(item: Record<string, unknown>, field?: string): Array<Record<string, unknown>> {
  const groups = field ? item[field] : undefined;
  // Section binding filters top-level items only. Nested groups retain the same
  // imported visibility values as the former tree, before either backend renders.
  return Array.isArray(groups) ? groups.filter((value): value is Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return value.visible !== false && value.visible !== 'false' && value.visible !== 0;
  }) : [];
}
