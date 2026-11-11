import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { blueLineTemplate } from './blue-line-template';
import { MagicResumeRenderer } from '../renderer/MagicResumeRenderer';
import { MagicResumePdfDocument } from '../pdf/MagicResumePdfDocument';
import type { Resume } from '../types/resume';

function outputs(section: string, item: Record<string, unknown>) {
  const template = structuredClone(blueLineTemplate);
  template.components = template.components.filter((component) => component.dataBinding === `sections.${section}`);
  const data = { info: {}, sections: { [section]: [{ id: 'fixture', ...item }] }, sectionOrder: [], template: template.id } as unknown as Resume;
  return [
    { backend: 'DOM', root: parse(renderToStaticMarkup(<MagicResumeRenderer template={template} data={data} />)) },
    { backend: 'PDF', root: parse(renderToStaticMarkup(<MagicResumePdfDocument template={template} data={data} />)) },
  ];
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
