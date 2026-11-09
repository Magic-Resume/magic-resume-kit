import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'node-html-parser';
import { blueLineTemplate } from './blue-line-template';
import { MagicResumeRenderer } from '../renderer/MagicResumeRenderer';
import { MagicResumePdfDocument } from '../pdf/MagicResumePdfDocument';
import type { Resume } from '../types/resume';

function outputs(data: Partial<Resume>, binding?: string) {
  const template = structuredClone(blueLineTemplate);
  if (binding) template.components = template.components.filter((component) => component.dataBinding === binding);
  const resume = { info: {}, sections: {}, sectionOrder: [], template: template.id, ...data } as Resume;
  return [
    renderToStaticMarkup(<MagicResumeRenderer template={template} data={resume} />),
    renderToStaticMarkup(<MagicResumePdfDocument template={template} data={resume} />),
  ];
}

test('Blue Line declares every supported section with the ordinary component contract', () => {
  assert.deepEqual(blueLineTemplate.components.map((component) => component.dataBinding), [
    'info', 'sections.education', 'sections.skills', 'sections.experience', 'sections.projects', 'sections.openSource',
    'sections.summary', 'sections.personalEvaluation', 'sections.profiles', 'sections.languages', 'sections.awards', 'sections.certificates',
  ]);
  assert.equal(blueLineTemplate.components[0].type, 'Header');
  assert.ok(blueLineTemplate.components.slice(1).every((component) => component.type === 'DefaultSection' && !component.tree));
});

test('shared Header preserves role-first identity, links, custom contacts and name fallback', () => {
  const info = {
    fullName: '陈予安', headline: '前端开发工程师', phoneNumber: '13800000000', email: 'chen@example.com',
    address: '杭州', website: 'https://example.com', avatar: '',
    customFields: [{ id: 'github', name: 'GitHub', value: 'https://github.com/example', icon: 'github' }],
  };
  for (const output of outputs({ info }, 'info')) {
    for (const text of Object.values(info).filter((value) => typeof value === 'string' && value)) assert.ok(output.includes(text as string));
    const text = parse(output).textContent;
    assert.ok(text.indexOf('前端开发工程师') < text.indexOf('陈予安'));
    assert.ok(output.includes('https://github.com/example'));
  }
  for (const output of outputs({ info: { ...info, headline: '', customFields: [] } }, 'info')) assert.ok(output.includes('陈予安'));
});

test('shared sections preserve mapped optional fields and rich text across all content types', () => {
  const sections = {
    education: [{ id: 'ed', school: '示例大学', degree: '学士', major: '计算机科学', date: '2020–2024', location: '杭州', gpa: '3.8/4.0', summary: '<p>课程项目</p>' }],
    skills: [{ id: 'sk', name: 'TypeScript', level: '熟练', summary: '<p>类型系统</p>' }],
    projects: [{ id: 'pr', name: '协作工具', role: '前端负责人', date: '2025', link: 'https://example.com/project', technologies: 'React、TypeScript', summary: '<p>协同编辑</p>' }],
    openSource: [{ id: 'os', name: '开源工具', role: '维护者', date: '2026', link: 'https://example.com/open-source', technology: 'TypeScript', summary: '<p>开源协作</p>' }],
    summary: [{ id: 'su', summary: '<p>重视工程质量</p>' }],
    personalEvaluation: [{ id: 'pe', summary: '<p>持续学习与合作</p>' }],
    profiles: [{ id: 'pf', platform: 'GitHub', username: 'example', url: 'https://github.com/example', summary: '<p>开源记录</p>' }],
    languages: [{ id: 'la', language: '英语', level: '专业工作能力', summary: '<p>技术交流</p>' }],
    certificates: [{ id: 'ce', certificate: '示例认证', issuer: '示例机构', date: '2025', summary: '<p>云计算认证</p>' }],
    awards: [{ id: 'aw', title: '示例奖项', issuer: '示例组织', date: '2025', level: '国家级', summary: '<p>工程实践奖</p>' }],
  };
  for (const [key, items] of Object.entries(sections)) {
    for (const output of outputs({ sections } as unknown as Partial<Resume>, `sections.${key}`)) {
      for (const [field, value] of Object.entries(items[0])) {
        if (field === 'id') continue;
        const text = String(value).replace(/<[^>]+>/g, '');
        assert.ok(output.includes(text), `${key}.${field}: ${text}`);
      }
    }
  }
});

test('summary-only skills never fall back to the resume name', () => {
  for (const output of outputs({ name: 'Unrelated resume title', sections: { skills: [{ id: 'sk', summary: '<ul><li>事件循环</li></ul>' }] } } as unknown as Partial<Resume>, 'sections.skills')) {
    assert.ok(output.includes('事件循环'));
    assert.ok(!parse(output).textContent.includes('Unrelated resume title'));
  }
});

test('language imports preserve fluency and proficiency aliases in the shared field map', () => {
  for (const alias of ['fluency', 'proficiency']) {
    for (const output of outputs({ sections: { languages: [{ id: 'language', language: 'English', [alias]: 'Working proficiency' }] } } as unknown as Partial<Resume>, 'sections.languages')) {
      assert.ok(output.includes('Working proficiency'), alias);
    }
  }
});

test('compact contact fields preserve inline formatting in HTML and PDF', () => {
  const customFields = [{ id: 'formatted', name: 'Profile', value: '<strong>Formatted contact</strong>' }];
  const data = {
    info: { fullName: 'Example', customFields },
    sections: { experience: [{ id: 'exp', company: 'Company', customFields }] },
  } as unknown as Partial<Resume>;
  for (const output of outputs(data)) {
    assert.ok(output.includes('Formatted contact'));
    assert.ok(!output.includes('&lt;strong&gt;'), 'formatting tags must not be printed as text');
  }
});

test('compact experience preserves title band, groups, custom fields, summary fallback and visibility', () => {
  const data = { sections: { experience: [
    { id: 'exp', visible: true, company: '示例科技', position: '工程师', description: '<p>旧版描述</p>',
      customFields: [{ id: 'team', name: '团队', value: '基础平台' }],
      groups: [{ title: '项目分组', description: '<ul><li>首屏性能优化</li></ul>' }] },
    { id: 'hidden', visible: false, company: '隐藏公司' },
  ] } } as unknown as Partial<Resume>;
  for (const output of outputs(data, 'sections.experience')) {
    for (const text of ['示例科技', '工程师', '旧版描述', '团队', '基础平台', '项目分组', '首屏性能优化', '#f2f3f5']) assert.ok(output.includes(text), text);
    assert.ok(!output.includes('隐藏公司'));
  }
});

test('compact PDF rich text uses the same converted em body size as the section', () => {
  const template = structuredClone(blueLineTemplate);
  template.designTokens.typography.fontSize.sm = '1em';
  template.components = template.components.filter((component) => component.dataBinding === 'sections.summary');
  const data = { info: {}, sections: { summary: [{ id: 'summary', summary: '<ol><li>Body with em units</li></ol>' }] }, sectionOrder: [], template: template.id } as unknown as Resume;
  const output = parse(renderToStaticMarkup(<MagicResumePdfDocument template={template} data={data} />));
  const marker = output.querySelectorAll('*').find((node) => node.tagName.toLowerCase() === 'text' && node.textContent === '1.');
  assert.ok(marker);
  assert.match(marker.getAttribute('style') ?? '', /(?:^|;)font-size:12px(?:;|$)/);
});
