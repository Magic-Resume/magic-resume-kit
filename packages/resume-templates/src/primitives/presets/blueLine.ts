import type { TemplateDocument, TemplateNode, TextNode } from '../ast';

/** Shared by the header and each independently reorderable section. */
const styles: TemplateDocument['styles'] = {
  body: {
    color: 'var(--color-text)', fontSize: 'var(--font-size-sm)',
    lineHeight: 'var(--line-height)', letterSpacing: 'var(--letter-spacing)',
  },
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
  entry: { gap: 'var(--spacing-xs)' },
  title: { color: 'var(--color-secondary)', fontSize: 'var(--font-size-md)', fontWeight: 700, lineHeight: 1.35, textDecoration: 'none' },
  muted: { color: 'var(--color-text-secondary)' },
  contactText: {
    color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: 13,
    lineHeight: 1.6, flexShrink: 1, minWidth: 0, maxWidth: '100%',
  },
  contactValue: { flexBasis: 0, flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: '100%' },
  accent: { color: 'var(--color-primary)' },
  date: { color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', fontWeight: 400, flexShrink: 0 },
  contact: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    flexShrink: 1, minWidth: 0, width: '100%',
  },
  // SVG bounds are geometrically centered, while CJK glyph ink sits above the
  // line-box center because of font ascent/descent. Lift contact icons slightly
  // so their visible centers align in both DOM and PDF.
  contactIcon: { marginTop: -6 },
  heading: {
    paddingBottom: 3, borderBottomWidth: 1.5,
    borderStyle: 'solid', borderColor: 'var(--color-primary)',
  },
  headingText: { color: 'var(--color-primary)', fontSize: 'var(--font-size-lg)', fontWeight: 700, lineHeight: 1.25 },
  /** Experience title bar from the compact delivery sheet. */
  band: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap',
    gap: 12, backgroundColor: '#f2f3f5', borderRadius: 2,
    paddingTop: 5, paddingBottom: 5, paddingLeft: 7, paddingRight: 7,
  },
  groupTitle: { color: '#254e94', fontSize: 'var(--font-size-md)', fontWeight: 700, lineHeight: 1.35, marginTop: 7, marginBottom: 3 },
};

const text = (id: string, read: string | string[], style?: TextNode['style']): TextNode => ({
  id, type: 'Text', value: { read }, ...(style ? { style } : {}),
});

const customFields = (id: string, path: string): TemplateNode => ({
  id, type: 'Box', each: { path, as: 'field' },
  when: { or: [{ exists: 'field.name' }, { exists: 'field.value' }] },
  style: ['contact', 'muted'],
  children: [
    { id: `${id}-icon`, type: 'Icon', name: { read: 'field.icon' }, size: 15, when: { exists: 'field.icon' }, style: ['muted', 'contactIcon'] },
    { id: `${id}-label`, type: 'Box', when: { exists: 'field.name' }, style: ['contactValue', { flexBasis: 'auto', flexGrow: 0, maxWidth: '40%' }], children: [
      { id: `${id}-name`, type: 'Text', value: '{{field.name}}：', style: ['contactText'] },
    ] },
    // Nested custom fields are displayed read-only: section edits target the parent item.
    { id: `${id}-content`, type: 'Box', style: ['contactValue'], children: [
      { id: `${id}-value`, type: 'Text', value: '{{field.value}}', href: { read: 'field.value' }, style: ['contactText'] },
    ] },
  ],
});

const contact = (id: string, path: string, icon: string, linked = false): TemplateNode => ({
  id, type: 'Box', when: { exists: path }, style: ['contact'],
  children: [
    { id: `${id}-icon`, type: 'Icon', name: icon, size: 17, style: ['muted', 'contactIcon'] },
    // Constrain the box around links too: the DOM backend wraps linked Text in an anchor.
    { id: `${id}-content`, type: 'Box', style: ['contactValue'], children: [
      { ...text(`${id}-value`, path, ['contactText']), ...(linked ? { href: { read: path } } : {}) },
    ] },
  ],
});

export function blueLineHeaderPreset(): TemplateDocument {
  return {
    version: 1, styles,
    root: {
      id: 'blue-line-header', type: 'Box', style: ['body', { gap: 'var(--spacing-xl)' }],
      children: [
        { id: 'blue-line-role', type: 'Text', role: 'title', value: { read: ['info.headline', 'info.fullName'] },
          style: [{ color: '#080808', fontSize: 'var(--font-size-xxl)', fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.5 }] },
        { id: 'blue-line-contact-grid', type: 'Box',
          style: [{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-lg)', fontSize: 13, lineHeight: 1.6 }],
          children: [
            { id: 'blue-line-contact-left', type: 'Box', style: [{ flexBasis: 0, flexGrow: 1, flexShrink: 1, minWidth: 0 }], children: [
              text('blue-line-name', 'info.fullName'),
              contact('blue-line-phone', 'info.phoneNumber', 'phone'),
              contact('blue-line-email', 'info.email', 'mail'),
              contact('blue-line-address', 'info.address', 'location'),
            ] },
            { id: 'blue-line-contact-right', type: 'Box', style: [{ alignItems: 'flex-end', flexBasis: 0, flexGrow: 1, flexShrink: 1, minWidth: 0 }], children: [
              contact('blue-line-website', 'info.website', 'globe', true),
              customFields('blue-line-custom-contact', 'info.customFields'),
            ] },
          ],
        },
      ],
    },
  };
}

export type BlueLineSectionKey = 'education' | 'skills' | 'experience' | 'projects' | 'openSource' | 'summary' | 'personalEvaluation' | 'profiles' | 'languages' | 'awards' | 'certificates';

const separatedRow = (id: string, children: TemplateNode[], style: TemplateNode['style'] = ['row']): TemplateNode => ({
  id, type: 'Box', style,
  separator: { id: `${id}-separator`, type: 'Text', value: '·', style: ['muted'] },
  children,
});

const techLine = (p: string): TemplateNode => ({
  id: `${p}-tech`, type: 'Box',
  when: { or: [{ exists: 'technologies' }, { exists: 'technology' }, { exists: 'techStack' }, { exists: 'tech' }] },
  style: ['row', { gap: 0, flexWrap: 'nowrap' }],
  children: [
    { id: `${p}-tech-label`, type: 'Text', value: '技术栈：', style: [{ fontWeight: 700 }] },
    text(`${p}-technologies`, ['technologies', 'technology', 'techStack', 'tech'], ['muted']),
  ],
});

const experienceGroups = (p: string): TemplateNode => ({
  id: `${p}-groups`, type: 'Box', each: { path: 'groups', as: 'group' },
  children: [
    { id: `${p}-group-title`, type: 'Text', value: { read: 'title' }, style: ['groupTitle'] },
    { id: `${p}-group-body`, type: 'RichText', value: { read: ['summary', 'description'] }, style: ['body'] },
  ],
});

const entryContent = (key: BlueLineSectionKey, p: string): TemplateNode[] => {
  switch (key) {
    case 'education': return [{
      id: `${p}-details`, type: 'Box', style: ['row', { gap: 13 }], children: [
        text(`${p}-school`, ['school', 'institution', 'name']),
        text(`${p}-degree`, 'degree', ['accent']), text(`${p}-major`, 'major'),
        text(`${p}-date`, 'date', ['date']), text(`${p}-gpa`, 'gpa'), text(`${p}-location`, 'location', ['muted']),
      ],
    }];
    case 'experience': return [
      { id: `${p}-title-row`, type: 'Box', style: ['band'], children: [
        separatedRow(`${p}-title`, [
          { ...text(`${p}-company`, ['company', 'name']), href: { read: ['website', 'url', 'link'] } },
          text(`${p}-position`, ['position', 'role']),
        ], ['row', 'title', { flexGrow: 1, flexShrink: 1 }]),
        text(`${p}-date`, 'date', ['date']),
      ] },
      text(`${p}-location`, 'location', ['muted']),
    ];
    case 'openSource':
    case 'projects': return [
      { id: `${p}-title-row`, type: 'Box', style: ['row', { justifyContent: 'space-between' }], children: [
        separatedRow(`${p}-title`, [
          { ...text(`${p}-name`, 'name', ['title']), href: { read: ['link', 'url', 'website'] } },
          text(`${p}-role`, 'role', [{ fontSize: 'var(--font-size-xs)', fontWeight: 400 }]),
        ], ['row', { flexGrow: 1, flexShrink: 1 }]),
        text(`${p}-date`, 'date', ['date']),
      ] },
      techLine(p),
    ];
    case 'skills': return [{
      ...separatedRow(`${p}-details`, [
        text(`${p}-name`, ['name', 'skill'], [{ fontWeight: 700 }]),
        text(`${p}-level`, 'level', ['muted']),
      ]),
      // `item.name` stays on the entry. A bare `name` also matches the resume title.
      when: { or: [{ exists: 'item.name' }, { exists: 'item.skill' }, { exists: 'item.level' }] },
    }];
    case 'languages': return [separatedRow(`${p}-details`, [
      text(`${p}-name`, ['name', 'language'], [{ fontWeight: 700 }]), text(`${p}-level`, ['level', 'fluency', 'proficiency'], ['muted']),
    ])];
    case 'profiles': return [separatedRow(`${p}-details`, [
      { ...text(`${p}-name`, ['platform', 'name'], [{ fontWeight: 700 }]), href: { read: ['url', 'link', 'website'] } },
      text(`${p}-username`, 'username', ['muted']),
      text(`${p}-date`, 'date', ['date']),
    ])];
    case 'awards':
    case 'certificates': return [{ id: `${p}-details`, type: 'Box', style: ['row', { justifyContent: 'space-between' }], children: [
      separatedRow(`${p}-name-issuer`, [
        { ...text(`${p}-name`, key === 'awards' ? ['name', 'title'] : ['name', 'certificate'], [{ fontWeight: 700 }]), href: { read: ['url', 'link'] } },
        text(`${p}-issuer`, 'issuer', ['muted']), text(`${p}-level`, 'level', ['muted']),
      ], ['row', { flexGrow: 1, flexShrink: 1 }]),
      text(`${p}-date`, 'date', ['date']),
    ] }];
    case 'personalEvaluation':
    case 'summary': return [];
  }
};

/** A per-section tree keeps renderer ordering, visibility and section controls active. */
export function blueLineSectionPreset(key: BlueLineSectionKey, title: string): TemplateDocument {
  const p = `blue-line-${key}`;
  return {
    version: 1, styles,
    root: {
      id: `${p}-section`, type: 'Box', section: { sectionKey: key, title, insertSlot: true },
      style: ['body', { gap: 'var(--spacing-sm)' }],
      children: [
        { id: `${p}-heading`, type: 'Box', section: { sectionKey: key, title, handle: true }, style: ['heading'],
          children: [{ id: `${p}-heading-text`, type: 'Text', role: 'sectionHeading', value: title, style: ['headingText'] }] },
        { id: `${p}-items`, type: 'Box', style: [{ gap: 'var(--spacing-md)' }], children: [
          { id: `${p}-item`, type: 'Box', each: { path: `sections.${key}` }, style: ['entry'], children: [
            ...entryContent(key, p),
            customFields(`${p}-custom`, 'customFields'),
            { id: `${p}-summary`, type: 'RichText', value: { read: ['summary', 'description'] }, style: ['body'] },
            ...(key === 'experience' ? [experienceGroups(p)] : []),
          ] },
        ] },
      ],
    },
  };
}
