import type { MagicTemplateDSL } from '../types/magic-dsl';
import { blueLineHeaderPreset, blueLineSectionPreset, type BlueLineSectionKey } from '../primitives/presets/blueLine';

const sections: Array<[BlueLineSectionKey, string]> = [
  ['education', '教育经历'], ['skills', '专业技能'], ['experience', '工作经历'], ['projects', '项目经历'], ['openSource', '开源贡献'],
  ['summary', '个人总结'], ['personalEvaluation', '个人评价'], ['profiles', '社交主页'], ['languages', '语言能力'], ['awards', '获奖经历'], ['certificates', '证书资质'],
];

export const blueLineTemplate: MagicTemplateDSL = {
  id: 'blue-line', name: 'Blue Line', version: '1.0.0',
  description: 'Single-column resume with blue section dividers, a prominent role heading, and compact delivery typography.',
  thumbnailUrl: '/templates/jpg/blue-line.jpg',
  tags: ['single-column', 'professional', 'minimal', 'blue', 'ats-friendly'],
  status: 'PUBLISHED', createdAt: '2026-10-16T00:00:00.000Z', updatedAt: '2026-11-09T00:00:00.000Z',
  designTokens: {
    // V7 delivery sheet: near-black body, deeper blue rules, tight leading.
    colors: { primary: '#2458b8', secondary: '#292929', text: '#20252b', textSecondary: '#20252b', background: '#ffffff', border: '#2458b8' },
    typography: {
      fontFamily: { primary: 'Arial, "Hiragino Sans GB", "Microsoft YaHei", sans-serif' },
      fontSize: { xs: '12px', sm: '13.3px', md: '14px', lg: '18px', xl: '22px', xxl: '25px' },
      fontWeight: { normal: 400, medium: 400, bold: 700 }, lineHeight: 1.3, letterSpacing: '0px',
    },
    spacing: { xs: '6px', sm: '5px', md: '7px', lg: '20px', xl: '12px' },
    borderRadius: { none: '0', sm: '2px', md: '0', lg: '0' },
  },
  layout: { type: 'single-column', pageSize: 'A4', containerWidth: '794px', padding: '38px 45px 42px', gap: '12px', showTitleDivider: true, showTitleIcon: false },
  components: [
    { id: 'header', type: 'Tree', dataBinding: 'info', position: { area: 'main' }, tree: blueLineHeaderPreset() },
    ...sections.map(([key, title]) => ({
      id: `${key}-section`, type: 'Tree' as const, dataBinding: `sections.${key}`,
      position: { area: 'main' as const }, props: { title }, tree: blueLineSectionPreset(key, title),
    })),
  ],
};
