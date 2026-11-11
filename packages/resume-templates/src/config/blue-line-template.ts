import type { ComponentDefinition, FieldMapping, MagicTemplateDSL } from '../types/magic-dsl';
import type { CompactPresentationProps } from '../templateLayout/compactPresentation';

const section = (key: string, title: string, itemLayout: CompactPresentationProps['itemLayout'], fieldMap: FieldMapping = {}, options: CompactPresentationProps = {}): ComponentDefinition => ({
  id: `${key}-section`, type: 'DefaultSection', dataBinding: `sections.${key}`, position: { area: 'main' },
  props: { title, presentation: 'compact', itemLayout, listMarkerAlignment: 'first-line', ...options },
  fieldMap: { description: ['summary', 'description'], ...fieldMap },
});

const projectFields: FieldMapping = { mainTitle: ['name', 'project', 'title'], mainSubtitle: ['role', 'position'], sideTitle: 'date' };
// Candidate order preserves imported data semantics even when the layout changes.
const projectOptions: CompactPresentationProps = { titleLinkField: ['link', 'url', 'website'], technologyField: ['technologies', 'technology', 'techStack', 'tech'], technologyLabel: '技术栈：' };

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
  layout: { type: 'single-column', pageSize: 'A4', containerWidth: '794px', padding: '38px 45px 42px', pdfPaddingMode: 'shorthand', gap: '12px', showTitleDivider: true, showTitleIcon: false },
  components: [
    { id: 'header', type: 'Header', dataBinding: 'info', position: { area: 'main' }, props: { presentation: 'compact' } },
    section('education', '教育经历', 'inline', { mainTitle: ['school', 'institution', 'name'], mainSubtitle: 'degree', secondarySubtitle: 'major', sideTitle: 'date', sideSubtitle: 'gpa', secondarySideSubtitle: 'location' }),
    section('skills', '专业技能', 'inline', { mainTitle: ['name', 'skill'], mainSubtitle: 'level' }, { separator: '·', fieldGap: 8, fieldStyles: { mainTitle: 'strong', mainSubtitle: 'muted' } }),
    section('experience', '工作经历', 'band', { mainTitle: ['company', 'name'], mainSubtitle: ['position', 'role'], secondarySubtitle: 'location', sideTitle: 'date' }, { titleLinkField: ['website', 'url', 'link'], groupsField: 'groups', groupTitleColor: '#254e94' }),
    section('projects', '项目经历', 'split', projectFields, projectOptions),
    section('openSource', '开源贡献', 'split', projectFields, projectOptions),
    section('summary', '个人总结', 'body'),
    section('personalEvaluation', '个人评价', 'body'),
    section('profiles', '社交主页', 'inline', { mainTitle: ['platform', 'name'], mainSubtitle: 'username', sideTitle: 'date' }, { titleLinkField: ['url', 'link', 'website'], separator: '·', fieldGap: 8, fieldStyles: { mainTitle: 'strong', mainSubtitle: 'muted' } }),
    section('languages', '语言能力', 'inline', { mainTitle: ['name', 'language'], mainSubtitle: ['level', 'fluency', 'proficiency'] }, { separator: '·', fieldGap: 8, fieldStyles: { mainTitle: 'strong', mainSubtitle: 'muted' } }),
    section('awards', '获奖经历', 'split', { mainTitle: ['name', 'title'], mainSubtitle: 'issuer', secondarySideSubtitle: 'level', sideTitle: 'date' }, { titleLinkField: ['url', 'link'], fieldStyles: { mainTitle: 'strong', mainSubtitle: 'muted', secondarySideSubtitle: 'muted' } }),
    section('certificates', '证书资质', 'split', { mainTitle: ['name', 'certificate'], mainSubtitle: 'issuer', secondarySideSubtitle: 'level', sideTitle: 'date' }, { titleLinkField: ['url', 'link'], fieldStyles: { mainTitle: 'strong', mainSubtitle: 'muted', secondarySideSubtitle: 'muted' } }),
  ],
};
