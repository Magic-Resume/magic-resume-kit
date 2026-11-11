import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { defaultResume } from '@magic-resume-kit/resume-schema';
import { getTemplateById } from '../registry';
import type { ComponentDefinition, MagicTemplateDSL } from '../types/magic-dsl';
import type { Resume } from '../types/resume';
import { MagicResumePdfDocument } from './MagicResumePdfDocument';

const nestedList = '<ul><li>First line with enough words to wrap in a narrow column, preserving the same content and indentation.'
  + '<ul><li>Nested line<ul><li>Third level</li></ul></li></ul></li></ul>';
const mixedList = `${nestedList}<ol><li>Ordered first</li><li>Ordered second</li></ol>`;

function fixture(section = 'experience', html = mixedList): Resume {
  return {
    ...defaultResume, template: 'classic',
    sections: { [section]: [{ id: 'item', visible: true, company: 'Example company', name: 'Example item', summary: html }] },
    sectionOrder: [{ key: section, label: section }],
  } as Resume;
}

function markup(template: MagicTemplateDSL, data = fixture()): string {
  return renderToStaticMarkup(<MagicResumePdfDocument template={template} data={data} />);
}

function markerStyles(output: string): string[] {
  return [...output.matchAll(/<VIEW style="([^"]*)"/g)].map((match) => match[1])
    .filter((style) => style.includes('justify-content:center') && style.includes('flex-shrink:0') && style.includes('height:'));
}

function assertLift(output: string, expected: number) {
  const markers = markerStyles(output);
  assert.ok(markers.length >= 3, 'exercises disc, circle and square levels');
  for (const style of markers) {
    const offset = Number(style.match(/(?:^|;)margin-top:([^;]+)px(?:;|$)/)?.[1]);
    assert.ok(Math.abs(offset - expected) < 1e-10, `expected ${expected}pt marker offset, got ${style}`);
  }
}

function assertCentered(output: string) {
  const markers = markerStyles(output);
  assert.ok(markers.length >= 3);
  for (const style of markers) assert.doesNotMatch(style, /margin-top:/);
}

test('Classic explicitly selects the PDF first-line policy', () => {
  assert.equal(getTemplateById('classic').layout.pdfListMarkerAlignment, 'first-line');
});

for (const section of ['experience', 'skills', 'customNotes']) {
  test(`Classic ${section} descriptions inherit its policy after customization`, () => {
    const template = structuredClone(getTemplateById('classic'));
    template.id = 'personal-classic-layout';
    assertLift(markup(template, fixture(section)), -2.25);
  });
}

for (const [type, offset] of [
  ['DefaultSection', -2.25], ['ListSection', -2.25], ['ThreeColumnSection', -2.25],
  ['Timeline', -2], ['InlineKeyValueSection', -1.575],
] as const) {
  test(`${type} forwards the template PDF policy to rich text`, () => {
    const template = structuredClone(getTemplateById('classic'));
    template.layout.pdfListMarkerAlignment = 'first-line';
    template.components = [{
      id: 'description-route', type, dataBinding: 'sections.experience', position: { area: 'main' },
      fieldMap: { mainTitle: 'name', itemName: 'name', leftTitle: 'name', title: 'name', description: 'summary', summary: 'summary' },
    }];
    assertLift(markup(template), offset);
  });
}

test('component alignment overrides the template in both directions', () => {
  const template = structuredClone(getTemplateById('classic'));
  const component = template.components.find((candidate) => candidate.dataBinding === 'sections.experience');
  assert.ok(component);
  template.layout.pdfListMarkerAlignment = 'first-line';
  component.props = { ...component.props, listMarkerAlignment: 'center' };
  assertCentered(markup(template));
  template.layout.pdfListMarkerAlignment = 'center';
  component.props.listMarkerAlignment = 'first-line';
  assertLift(markup(template), -2.25);
  delete component.props.listMarkerAlignment;
  assertCentered(markup(template));
});

test('first-line mode changes only unordered marker offsets in wrapped and nested content', () => {
  const template = structuredClone(getTemplateById('classic'));
  template.layout.containerWidth = '320px';
  template.layout.pdfListMarkerAlignment = 'center';
  const centered = markup(template);
  template.layout.pdfListMarkerAlignment = 'first-line';
  const lifted = markup(template);
  assertLift(lifted, -2.25);
  assert.equal(lifted.replace(/;margin-top:-[\d.]+px/g, ''), centered,
    'text, ordered numbers, nesting shapes, indentation and remaining layout styles stay identical');
  assert.equal(markup(template, fixture('experience', '<ol><li>Ordered first</li><li>Ordered second</li></ol>')),
    markup({ ...template, layout: { ...template.layout, pdfListMarkerAlignment: 'center' } },
      fixture('experience', '<ol><li>Ordered first</li><li>Ordered second</li></ol>')));
});

function tree() {
  return {
    version: 1 as const, styles: { body: { fontSize: 12, lineHeight: 1.5 } },
    root: { id: 'tree-description', type: 'RichText' as const, style: ['body'], value: mixedList },
  };
}

test('component trees inherit the template policy and honor a component center override', () => {
  const template = structuredClone(getTemplateById('classic'));
  template.layout.pdfListMarkerAlignment = 'first-line';
  const component: ComponentDefinition = { id: 'tree-section', type: 'Tree', dataBinding: 'sections.experience', position: { area: 'main' }, tree: tree() };
  template.components = [component];
  assertLift(markup(template), -2.25);
  component.props = { listMarkerAlignment: 'center' };
  assertCentered(markup(template));
});

test('full-document trees inherit the template PDF policy', () => {
  const template = structuredClone(getTemplateById('classic'));
  const data = { ...fixture(), templateOverride: tree() } as Resume;
  template.layout.pdfListMarkerAlignment = 'first-line';
  assertLift(markup(template, data), -2.25);
  template.layout.pdfListMarkerAlignment = 'center';
  assertCentered(markup(template, data));
  delete template.layout.pdfListMarkerAlignment;
  assertCentered(markup(template, data));
});
