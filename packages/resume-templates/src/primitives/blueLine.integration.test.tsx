import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { templateSchema } from '@magic-resume-kit/resume-schema';
import { getTemplateById, getTemplateManifestById, templateRegistry } from '../registry';
import { MagicResumeRenderer } from '../renderer/MagicResumeRenderer';
import { MagicResumePdfDocument } from '../pdf/MagicResumePdfDocument';
import { PdfRichText } from '../pdf/PdfRichText';
import { EditableCanvasProvider } from '../renderer/EditableCanvas';
import type { Resume } from '../types/resume';

const resume = {
  name: 'Fictional template check',
  info: { fullName: '林知远', headline: '前端开发工程师', email: 'lin@example.com', customFields: [] },
  sections: {
    education: [{ id: 'edu', school: '示例大学', visible: true }],
    experience: [{ id: 'exp', company: '星河科技', visible: true, summary: '<p>可编辑的经历正文</p>' }],
    projects: [{ id: 'hidden-project', name: '不应显示的项目', visible: false }],
  },
  sectionOrder: [{ key: 'experience', label: '工作经历' }, { key: 'education', label: '教育经历' }, { key: 'projects', label: '项目经历' }],
  template: 'blue-line',
  themeColor: '#0879ee',
  typography: 'Source Han Sans SC',
  documentLanguage: 'zh',
} as unknown as Resume;

test('Blue Line uses the existing Header and DefaultSection components without a private tree', () => {
  const template = getTemplateById('blue-line');
  assert.equal(template.components[0].type, 'Header');
  for (const component of template.components.slice(1)) {
    assert.equal(component.type, 'DefaultSection');
    assert.ok(component.fieldMap?.description, `${component.id}: standard description binding`);
  }
  assert.ok(template.components.every((component) => component.tree === undefined));
});

test('compact presentation preserves partial contacts, technology, groups and field editing without a template ID check', () => {
  const template = structuredClone(getTemplateById('blue-line'));
  template.id = 'reusable-compact-layout';
  const data = {
    ...resume,
    info: { ...resume.info, customFields: [{ id: 'profile', name: '', value: 'https://example.com/profile', icon: 'github' }] },
    sections: {
      experience: [{ id: 'exp', company: 'Example Company', position: 'Engineer', visible: true,
        summary: '<ul><li>Main experience</li></ul>', groups: [{ title: 'Delivery group', description: '<p>Nested contribution</p>' }] }],
      projects: [{ id: 'project', name: 'Example Project', technologies: 'TypeScript / React', visible: true }],
    },
    sectionOrder: [{ key: 'experience', label: 'Experience' }, { key: 'projects', label: 'Projects' }],
  } as unknown as Resume;
  const html = renderToStaticMarkup(
    <EditableCanvasProvider value={{
      enabled: true, pendingByPath: {}, processingPaths: [], errorsByPath: {}, activePath: null,
      onHandleClick() {}, onAccept() {}, onDiscard() {}, onRegenerate() {}, onRetry() {}, onSectionHandleClick() {},
    }}>
      <MagicResumeRenderer template={template} data={data} />
    </EditableCanvasProvider>,
  );
  const pdf = renderToStaticMarkup(<MagicResumePdfDocument template={template} data={data} />);
  for (const output of [html, pdf]) {
    for (const text of ['https://example.com/profile', 'Example Company', 'Engineer', 'Delivery group', 'Nested contribution', 'TypeScript / React']) {
      assert.ok(output.includes(text), `shared components preserve ${text}`);
    }
  }
  assert.match(html, /data-resume-path="sections\.experience\[exp\]\.company"/);
  assert.match(pdf, /justify-content:center;margin-top:-/);
});

test('blue-line uses the compact delivery metrics on the page', () => {
  const template = getTemplateById('blue-line');
  assert.equal(template.designTokens.typography.fontSize.sm, '13.3px');
  assert.equal(template.designTokens.typography.lineHeight, 1.3);
  assert.equal(template.layout.padding, '38px 45px 42px');
  const html = renderToStaticMarkup(<MagicResumeRenderer template={template} data={resume} />);
  const pdf = renderToStaticMarkup(MagicResumePdfDocument({ template, data: resume }));
  assert.match(html, /padding:38px 45px 42px/);
  assert.match(html, /font-size:25px/);
  assert.match(html, /#f2f3f5/);
  assert.match(html, /Arial, &quot;Hiragino Sans GB&quot;, &quot;Microsoft YaHei&quot;, sans-serif|Arial, "Hiragino Sans GB", "Microsoft YaHei", sans-serif/);
  assert.match(pdf, /padding-top:28\.5/);
  assert.match(pdf, /padding-right:33\.75/);
  assert.match(pdf, /padding-bottom:31\.5/);
  assert.match(pdf, /padding-left:33\.75/);
});

test('PDF rich text preserves the commercial installed marker placement unless explicitly disabled', () => {
  // Commercial baseline 395d261 already lifted every marker. A missing option must retain
  // that output when an application upgrades its template package.
  const list = '<ul><li>带符号的经历正文</li></ul>';
  const props = { html: list, color: '#000', fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.3 };

  const hasLiftedMarker = (pdf: string) =>
    [...pdf.matchAll(/margin-top:(-?[\d.]+)/g)].some((match) => Number(match[1]) < 0);

  const inherited = renderToStaticMarkup(React.createElement(PdfRichText, props));
  const off = renderToStaticMarkup(React.createElement(PdfRichText, { ...props, liftListMarker: false }));
  const on = renderToStaticMarkup(React.createElement(PdfRichText, { ...props, liftListMarker: true }));

  assert.equal(inherited, on, 'omitting the option preserves the installed default');
  assert.ok(hasLiftedMarker(inherited), 'installed default retains its marker lift');
  assert.ok(!hasLiftedMarker(off), 'an explicit false still disables the marker lift');
  assert.doesNotMatch(off, /justify-content:center;margin-top:/);
});

test('registered and customized templates preserve the commercial installed marker default', () => {
  const data = {
    ...resume,
    sections: {
      experience: [{ id: 'exp', company: 'Example', visible: true,
        summary: '<ul><li>First line with enough words to wrap in a narrow column<ul><li>Nested item</li></ul></li></ul><ol><li>Ordered item</li></ol>' }],
    },
    sectionOrder: [{ key: 'experience', label: 'Experience' }],
  } as unknown as Resume;
  for (const { template: base } of Object.values(templateRegistry)) {
    for (const customized of [false, true]) {
      const template = structuredClone(base);
      if (customized) template.id = `${base.id}-custom`;
      const pdf = renderToStaticMarkup(<MagicResumePdfDocument template={template} data={{ ...data, template: base.id }} />);
      const markers = [...pdf.matchAll(/<VIEW style="([^"]*)"/g)]
        .map((match) => match[1])
        .filter((style) => style.includes('justify-content:center') && style.includes('flex-shrink:0') && style.includes('height:'));
      assert.ok(markers.length >= 2, `${template.id}: exercises outer and nested rich-text bullets`);
      for (const marker of markers) {
        assert.match(marker, /margin-top:-/, `${template.id}: installed default placement survives an upgrade`);
        if (base.id === 'classic') {
          const marginTop = marker.match(/(?:^|;)margin-top:(-?[\d.]+)px(?:;|$)/)?.[1];
          assert.equal(Number(marginTop), -2.25, 'Classic retains the installed -2.25pt / -3 CSS px marker offset');
        }
      }
    }
  }
});

test('compact and component-tree lists inherit the installed default and honor explicit alignment', () => {
  const list = '<ul><li>First line<ul><li>Nested line</li></ul></li></ul>';
  const data = {
    ...resume,
    sections: { experience: [{ id: 'exp', company: 'Example', visible: true, summary: list }] },
    sectionOrder: [{ key: 'experience', label: 'Experience' }],
  } as unknown as Resume;
  for (const path of ['compact', 'tree'] as const) {
    for (const alignment of [undefined, 'first-line', 'center'] as const) {
      const template = structuredClone(getTemplateById(path === 'compact' ? 'blue-line' : 'classic'));
      const component = template.components.find((item) => item.dataBinding === 'sections.experience');
      assert.ok(component);
      component.props = { ...component.props };
      if (alignment) component.props.listMarkerAlignment = alignment;
      else delete component.props.listMarkerAlignment;
      if (path === 'tree') component.tree = {
        version: 1,
        styles: { body: { fontSize: 12, lineHeight: 1.5 } },
        root: { id: 'body', type: 'RichText', style: ['body'], value: list },
      };
      const pdf = renderToStaticMarkup(<MagicResumePdfDocument template={template} data={data} />);
      const markers = [...pdf.matchAll(/<VIEW style="([^"]*)"/g)]
        .map((match) => match[1])
        .filter((style) => style.includes('justify-content:center') && style.includes('flex-shrink:0') && style.includes('height:'));
      assert.equal(markers.length, 2, `${path}/${alignment}: includes outer and nested markers`);
      for (const marker of markers) {
        if (alignment === 'center') assert.doesNotMatch(marker, /margin-top:/);
        else assert.match(marker, /margin-top:-/, `${path}/${alignment}: retain installed placement`);
      }
    }
  }
});

test('blue-line is accepted by the shared schema and exposed by the registry', () => {
  assert.equal(templateSchema.safeParse('blue-line').success, true);
  assert.equal(getTemplateById('blue-line').id, 'blue-line');
  assert.equal(getTemplateManifestById('blue-line').thumbnailUrl, '/templates/jpg/blue-line.jpg');
});

test('blue-line preserves section order and skips hidden-only sections in HTML and PDF', () => {
  const template = getTemplateById('blue-line');
  assert.equal(template.id, 'blue-line');
  const html = renderToStaticMarkup(<MagicResumeRenderer template={template} data={resume} />);
  const pdf = renderToStaticMarkup(MagicResumePdfDocument({ template, data: resume }));
  for (const output of [html, pdf]) {
    assert.ok(output.indexOf('星河科技') < output.indexOf('示例大学'));
    assert.doesNotMatch(output, /不应显示的项目|项目经历/);
    assert.match(output, /前端开发工程师/);
  }
  // 网页富文本由浏览器清洗后填入；PDF 在服务端直接生成正文。
  assert.match(pdf, /可编辑的经历正文/);
});

test('blue-line applies the same custom color and body size to HTML and PDF', () => {
  const template = structuredClone(getTemplateById('blue-line'));
  assert.equal(template.id, 'blue-line');
  template.designTokens.colors.primary = '#a12345';
  template.designTokens.typography.fontSize.sm = '18px';
  template.designTokens.typography.fontSize.lg = '24px';
  const html = renderToStaticMarkup(<MagicResumeRenderer template={template} data={resume} />);
  const pdf = renderToStaticMarkup(MagicResumePdfDocument({ template, data: resume }));
  assert.match(html, /color:#a12345/);
  assert.match(pdf, /color:#a12345/);
  assert.match(html, /font-size:18px/);
  assert.match(html, /<h2[^>]*font-size:24px/);
  assert.match(pdf, /font-size:13\.5px/);
  assert.match(pdf, /font-size:18px[^>]*>工作经历/);
});

test('blue-line localizes every section for English documents and preserves explicit headings', () => {
  const titles = {
    education: 'Education', skills: 'Skills', experience: 'Work Experience', projects: 'Projects',
    openSource: 'Open Source Contributions', summary: 'Summary', personalEvaluation: 'Self Assessment',
    profiles: 'Links', languages: 'Languages', awards: 'Awards', certificates: 'Certifications',
  };
  const data: Resume = {
    ...resume,
    documentLanguage: 'en',
    sections: Object.fromEntries(Object.keys(titles).map((key) => [key, [
      { id: key, visible: true, name: 'Example', summary: '<p>Example content.</p>' },
    ]])),
    sectionOrder: Object.keys(titles).map((key) => ({ key, label: `sections.${key}` })),
  };
  const template = getTemplateById('blue-line');
  for (const Renderer of [MagicResumeRenderer, MagicResumePdfDocument]) {
    const output = renderToStaticMarkup(<Renderer template={template} data={data} locale="zh" />);
    for (const title of Object.values(titles)) assert.ok(output.includes(title), `Missing English heading: ${title}`);
    assert.doesNotMatch(output, /开源贡献|个人评价/);
    const custom = { ...data, sectionOrder: [{ key: 'openSource', label: 'sections.openSource', title: 'Selected Community Work' }] };
    const customized = renderToStaticMarkup(<Renderer template={template} data={custom} locale="zh" />);
    assert.ok(customized.includes('Selected Community Work'));
  }
});
