import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse, type HTMLElement } from 'node-html-parser';
import { defaultResume, resumeSchema } from '@magic-resume-kit/resume-schema';
import { pdf } from '@react-pdf/renderer';
import { blueLineTemplate } from './blue-line-template';
import { MagicResumeRenderer } from '../renderer/MagicResumeRenderer';
import { MagicResumePdfDocument } from '../pdf/MagicResumePdfDocument';
import type { Resume } from '../types/resume';

type Backend = 'DOM' | 'PDF';
type Colors = typeof blueLineTemplate.designTokens.colors;
type PdfStyle = Record<string, unknown> | PdfStyle[];
interface PdfNode { type: string; value?: string; style?: PdfStyle; children?: PdfNode[] }

function flattenedStyle(style?: PdfStyle): Record<string, unknown> {
  return Array.isArray(style) ? Object.assign({}, ...style.map(flattenedStyle)) : style ?? {};
}

function pdfStyleMarkup(node: PdfNode, key = 0): React.ReactNode {
  return node.type === 'TEXT_INSTANCE' ? node.value
    : React.createElement(node.type.toLowerCase(), { key, style: flattenedStyle(node.style) }, node.children?.map(pdfStyleMarkup));
}

function output(backend: Backend, section: string, item: Record<string, unknown>, colors?: Colors) {
  const template = structuredClone(blueLineTemplate);
  template.components = template.components.filter((component) => component.dataBinding === `sections.${section}`);
  if (colors) template.designTokens.colors = colors;
  // Section items intentionally accept imported nested values through catchall.
  // Prove each renderer can consume the public schema's accepted data.
  const data = resumeSchema.parse({ ...defaultResume, sections: { [section]: [{ id: 'fixture', visible: true, ...item }] }, sectionOrder: [], template: template.id }) as unknown as Resume;
  if (backend === 'PDF' && colors) {
    // React DOM SSR prints PDF style arrays as "0:[object Object]". Inspect
    // the actual PDF renderer tree and flatten arrays in their original order
    // before resolving inherited colors; otherwise body color would be lost.
    const document = pdf(<MagicResumePdfDocument template={template} data={data} />).container.document as PdfNode;
    return parse(renderToStaticMarkup(pdfStyleMarkup(document)));
  }
  return parse(renderToStaticMarkup(backend === 'DOM'
    ? <MagicResumeRenderer template={template} data={data} />
    : <MagicResumePdfDocument template={template} data={data} />));
}

function outputs(section: string, item: Record<string, unknown>) {
  return (['DOM', 'PDF'] as const).map((backend) => ({ backend, root: output(backend, section, item) }));
}

function textNode(root: HTMLElement, value: string) {
  const node = root.querySelectorAll('*').reverse().find((candidate) => candidate.textContent === value);
  assert.ok(node, `missing rendered text: ${value}`);
  return node;
}

// These properties inherit in both renderers. Resolve ancestors so a role that
// correctly inherits body color is treated the same as an explicit body color.
function inheritedStyle(node: HTMLElement, property: string): string | undefined {
  for (let current: HTMLElement | null = node; current; current = current.parentNode) {
    const value = current.getAttribute('style')?.split(';').map((declaration) => declaration.split(':'))
      .find(([name]) => name.trim() === property)?.slice(1).join(':').trim();
    if (!value || value === 'inherit') continue;
    const variable = value.match(/^var\((--[^)]+)\)$/)?.[1];
    return variable ? inheritedStyle(current, variable) : value;
  }
}

const linkCandidates = {
  profiles: ['url', 'link', 'website'],
  awards: ['url', 'link'],
  certificates: ['url', 'link'],
  projects: ['link', 'url', 'website'],
  openSource: ['link', 'url', 'website'],
  experience: ['website', 'url', 'link'],
};

for (const [section, candidates] of Object.entries(linkCandidates)) {
  test(`compact ${section} preserves title link precedence and fallback in DOM and PDF`, () => {
    for (let first = 0; first < candidates.length; first++) {
      const links = Object.fromEntries(candidates.map((field, index) => [field, index < first ? '' : `https://${field}.example/title`]));
      for (const { backend, root } of outputs(section, { name: 'LINK_TITLE', ...links })) {
        assert.ok(root.textContent.includes('LINK_TITLE'), `${backend}: title must remain visible`);
        const link = root.querySelectorAll('*').find((node) => ['a', 'link'].includes(node.tagName.toLowerCase()));
        assert.ok(link, `${backend}: ${section} title must remain linked`);
        assert.equal(link.getAttribute('href') ?? link.getAttribute('src'), links[candidates[first]], `${backend}: ${section} must prefer ${candidates[first]}`);
      }
    }
  });
}

for (const visible of [false, 'false', 0]) {
  test(`compact experience hides nested groups with visible=${JSON.stringify(visible)} in DOM and PDF`, () => {
    const groups = [
      { title: 'HIDDEN_GROUP_TITLE', summary: '<p>HIDDEN_GROUP_BODY</p>', visible },
      { title: 'EXPLICIT_VISIBLE_GROUP', description: '<p>EXPLICIT_VISIBLE_BODY</p>', visible: true },
      { title: 'DEFAULT_VISIBLE_GROUP', summary: '<p>DEFAULT_VISIBLE_BODY</p>' },
    ];
    for (const { backend, root } of outputs('experience', { company: 'Example company', groups })) {
      assert.ok(!root.textContent.includes('HIDDEN_GROUP_TITLE'), `${backend}: hidden group title must be omitted`);
      assert.ok(!root.textContent.includes('HIDDEN_GROUP_BODY'), `${backend}: hidden group body must be omitted`);
      for (const text of ['EXPLICIT_VISIBLE_GROUP', 'EXPLICIT_VISIBLE_BODY', 'DEFAULT_VISIBLE_GROUP', 'DEFAULT_VISIBLE_BODY']) {
        assert.ok(root.textContent.includes(text), `${backend}: ${text} must remain visible`);
      }
    }
  });
}

for (const backend of ['DOM', 'PDF'] as const) {
  for (const visible of [false, 'false', 0]) {
    test(`compact ${backend} hides custom fields with visible=${JSON.stringify(visible)}`, () => {
      const root = output(backend, 'experience', { customFields: [
        { id: 'hidden', name: 'PRIVATE_CUSTOM_LABEL', value: 'HIDDEN_CUSTOM_VALUE', visible },
        { id: 'visible', name: 'Visible', value: 'EXPLICIT_VISIBLE_CUSTOM_VALUE', visible: true },
        { id: 'default', name: 'Default', value: 'DEFAULT_VISIBLE_CUSTOM_VALUE' },
      ] });
      assert.ok(!root.textContent.includes('PRIVATE_CUSTOM_LABEL'), 'hidden custom-field label must be omitted');
      assert.ok(!root.textContent.includes('HIDDEN_CUSTOM_VALUE'), 'hidden custom-field value must be omitted');
      textNode(root, 'EXPLICIT_VISIBLE_CUSTOM_VALUE');
      textNode(root, 'DEFAULT_VISIBLE_CUSTOM_VALUE');
    });
  }

  for (const value of [3, 0]) {
    for (const name of ['Count', '']) {
      test(`compact ${backend} renders schema-valid custom field value=${value} with name=${JSON.stringify(name)}`, () => {
        const root = output(backend, 'experience', { company: 'NUMERIC_COMPANY', customFields: [{ id: 'number', name, value }] });
        const node = textNode(root, String(value));
        assert.ok(!['a', 'link'].includes(node.tagName.toLowerCase()), 'integer values remain plain text');
        if (name) assert.ok(root.textContent.includes('Count：'), 'named fields retain their label');
      });
    }
  }

  test(`compact ${backend} preserves custom field text, inline formatting and safe link semantics`, () => {
    for (const { value, text, href } of [
      { value: 'PLAIN_CUSTOM_VALUE', text: 'PLAIN_CUSTOM_VALUE', href: undefined },
      { value: '<strong>FORMATTED_CUSTOM_VALUE</strong>', text: 'FORMATTED_CUSTOM_VALUE', href: undefined },
      { value: 'https://example.com/custom', text: 'https://example.com/custom', href: 'https://example.com/custom' },
      { value: 'example.com/custom', text: 'example.com/custom', href: 'https://example.com/custom' },
      { value: 'javascript:alert(1)', text: 'javascript:alert(1)', href: undefined },
    ]) {
      const root = output(backend, 'experience', { customFields: [{ id: 'text', name: 'Custom', value }] });
      textNode(root, text);
      assert.ok(!root.textContent.includes('<strong>'), 'inline formatting tags must not be printed');
      const links = root.querySelectorAll('*').filter((node) => ['a', 'link'].includes(node.tagName.toLowerCase()));
      assert.deepEqual(links.map((node) => node.getAttribute('href') ?? node.getAttribute('src')), href ? [href] : []);
      if (value.startsWith('<strong>')) {
        const node = textNode(root, text);
        assert.ok(node.tagName.toLowerCase() === 'strong' || inheritedStyle(node, 'font-weight') === '700', 'inline emphasis remains bold');
      }
    }
  });

  const colors: Colors = { ...blueLineTemplate.designTokens.colors, primary: '#a12345', secondary: '#231456', text: '#123456', textSecondary: '#789abc' };
  const education = { school: 'COLOR_SCHOOL', degree: 'COLOR_DEGREE', major: 'COLOR_MAJOR', date: 'COLOR_DATE', gpa: 'COLOR_GPA', location: 'COLOR_LOCATION' };
  test(`compact ${backend} education preserves inherited and muted colors when body differs from textSecondary`, () => {
    const root = output(backend, 'education', education, colors);
    for (const [field, color] of Object.entries({ school: colors.text, degree: colors.primary, major: colors.text, date: colors.textSecondary, gpa: colors.text, location: colors.textSecondary })) {
      assert.equal(inheritedStyle(textNode(root, education[field as keyof typeof education]), 'color'), color, `${backend}: education.${field}`);
    }
  });

  for (const section of ['projects', 'openSource']) {
    test(`compact ${backend} ${section} role inherits body color when body differs from textSecondary`, () => {
      const root = output(backend, section, { name: 'COLOR_TITLE', role: 'COLOR_ROLE', date: 'COLOR_DATE', technologies: 'COLOR_TECHNOLOGIES', summary: '<p>COLOR_SUMMARY</p>' }, colors);
      for (const [text, color] of Object.entries({ COLOR_TITLE: colors.secondary, COLOR_ROLE: colors.text, COLOR_DATE: colors.textSecondary, COLOR_TECHNOLOGIES: colors.textSecondary, COLOR_SUMMARY: colors.text })) {
        assert.equal(inheritedStyle(textNode(root, text), 'color'), color, `${backend}: ${section}.${text}`);
      }
    });
  }
}
