import React from 'react';
import { getFieldEntry, safeHref } from './utils';
import { EditableField } from './EditableField';
import { WysiwygContent } from './WysiwygContent';
import { Editable, SectionHandle, SectionInsertSlot } from '../renderer/EditableCanvas';
import { InlineFormattedText } from '../renderer/InlineFormattedText';
import { sectionIconByName } from '../sectionIcons';
import { compactFields, compactGroups, compactPresentationStyles, type CompactPresentationProps } from './compactPresentation';

interface Item {
  [key: string]: unknown;
}

interface Props extends CompactPresentationProps {
  title: string;
  items: Item[];
  fieldMap: Record<string, string | string[]>;
  className?: string;
  style?: React.CSSProperties;
  titleClassName?: string;
  containerClassName?: string;
  titleIcon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  /** resume section key (e.g. `experience`) — enables the editable canvas anchors */
  sectionKey?: string;
}

export const DefaultSection = React.memo(function DefaultSection({ title, items, fieldMap, className, style, titleClassName, containerClassName, titleIcon: TitleIcon, sectionKey, presentation, itemLayout = 'split', titleLinkField, technologyField, technologyLabel, groupsField, groupTitleColor, fieldStyles, separator, fieldGap, designTokens }: Props) {
  if (!items || items.length === 0) return null;

  if (presentation === 'compact') {
    // This explicit opt-in keeps the legacy layout below unchanged.
    const compact = compactPresentationStyles(designTokens);
    const field = (item: Item, slot: string, fieldStyle?: React.CSSProperties) => {
      const href = slot === 'mainTitle'
        ? safeHref(getFieldEntry(item, titleLinkField)?.value)
        : null;
      const value = <EditableField item={item} field={fieldMap[slot]} sectionKey={sectionKey} label={title} />;
      return (
        <div key={slot} style={fieldStyles?.[slot] ? compact[fieldStyles[slot]] : fieldStyle}>
          {href ? <a href={href} style={{ color: 'inherit', textDecoration: 'none' }} target="_blank" rel="noreferrer noopener nofollow">{value}</a> : value}
        </div>
      );
    };
    return (
      <section className={className} data-template-line-height="true" style={{ ...style, display: 'flex', flexDirection: 'column', ...compact.body, ...compact.section }}>
        <h2 className={titleClassName} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4em', ...compact.heading, ...compact.headingText, borderBottomWidth: 'calc(var(--title-divider-width, 1px) * 1.5)' }}>
          {TitleIcon && <TitleIcon style={{ display: 'var(--title-icon-display)', flexShrink: 0, width: '1em', height: '1em' }} />}
          {title}
          {sectionKey && <SectionHandle sectionKey={sectionKey} title={title} />}
        </h2>
        <div className={containerClassName} style={{ display: 'flex', flexDirection: 'column', ...compact.items }}>
          {items.map((item, idx) => {
            const itemId = item.id != null ? String(item.id) : null;
            const description = getFieldEntry(item, fieldMap.description);
            const titleFields = compactFields(item, fieldMap, ['mainTitle', 'mainSubtitle', 'secondarySideSubtitle']);
            const inlineFields = compactFields(item, fieldMap, ['mainTitle', 'mainSubtitle', 'secondarySubtitle', 'sideTitle', 'sideSubtitle', 'secondarySideSubtitle']);
            const date = getFieldEntry(item, fieldMap.sideTitle);
            const technology = getFieldEntry(item, technologyField);
            const customFields = (Array.isArray(item.customFields) ? item.customFields : [])
              .filter((value) => value && typeof value === 'object' && (value.name || String(value.value ?? ''))
                && value.visible !== false && value.visible !== 'false' && value.visible !== 0);
            return (
              <div key={itemId || idx} style={{ display: 'flex', flexDirection: 'column', ...compact.item }}>
                {itemLayout === 'inline' ? inlineFields.length > 0 ? (
                  <div style={{ display: 'flex', ...compact.row, gap: fieldGap ?? 13 }}>
                    {inlineFields.map(({ slot }, index) => <React.Fragment key={slot}>
                      {index > 0 && separator ? <span style={compact.muted}>{separator}</span> : null}
                      {field(item, slot, slot === 'mainSubtitle' ? compact.accent : slot === 'sideTitle' ? compact.date : slot === 'secondarySideSubtitle' ? compact.muted : undefined)}
                    </React.Fragment>)}
                  </div>
                ) : null : itemLayout !== 'body' && (titleFields.length > 0 || date) ? (
                  <div style={{ display: 'flex', ...(itemLayout === 'band' ? compact.band : { ...compact.row, justifyContent: 'space-between' }) }}>
                    <div style={{ display: 'flex', ...compact.row, ...(itemLayout === 'band' ? compact.title : {}), flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
                      {titleFields.map(({ slot }, index) => (
                        <React.Fragment key={slot}>
                          {index > 0 ? <span style={compact.muted}><InlineFormattedText value="·" /></span> : null}
                          {field(item, slot, itemLayout === 'band' ? undefined : slot === 'mainTitle' ? compact.title : { ...compact.date, color: compact.body.color })}
                        </React.Fragment>
                      ))}
                    </div>
                    {date ? field(item, 'sideTitle', compact.date) : null}
                  </div>
                ) : null}
                {itemLayout === 'band' && getFieldEntry(item, fieldMap.secondarySubtitle) ? field(item, 'secondarySubtitle', compact.muted) : null}
                {technology ? (
                  <div style={{ display: 'flex', ...compact.row, gap: 0, flexWrap: 'nowrap' }}>
                    {technologyLabel ? <span style={{ fontWeight: 700 }}><InlineFormattedText value={technologyLabel} /></span> : null}
                    <div style={compact.muted}><EditableField item={item} field={technologyField} sectionKey={sectionKey} label={title} /></div>
                  </div>
                ) : null}
                {customFields.map((custom, index) => {
                  const Icon = sectionIconByName(custom.icon);
                  const value = String(custom.value ?? '');
                  const href = safeHref(value);
                  return (
                    <div key={custom.id || index} style={{ display: 'flex', ...compact.contact, ...compact.muted }}>
                      {Icon ? <Icon size={15} style={{ ...compact.contactIcon, color: String(compact.muted.color) }} /> : null}
                      {custom.name ? (
                        <div style={{ ...compact.contactValue, flexBasis: 'auto', flexGrow: 0, maxWidth: '40%' }}>
                          <span style={compact.contactText}><InlineFormattedText value={`${custom.name}：`} /></span>
                        </div>
                      ) : null}
                      <div style={compact.contactValue}>
                        {href ? <a href={href} style={compact.contactText} target="_blank" rel="noreferrer noopener nofollow"><InlineFormattedText value={value} /></a>
                          : <span style={compact.contactText}><InlineFormattedText value={value} /></span>}
                      </div>
                    </div>
                  );
                })}
                {description ? (
                  sectionKey && itemId && /^\w+$/.test(description.key) && typeof item[description.key] === 'string'
                    ? <Editable target={{ sectionKey, itemId, fieldKey: description.key, kind: 'html', label: `${title} · 第 ${idx + 1} 条` }} html={description.value} />
                    : <WysiwygContent dirtyHtml={description.value} />
                ) : null}
                {compactGroups(item, groupsField).map((group, index) => {
                  const groupTitle = getFieldEntry(group, 'title');
                  const groupDescription = getFieldEntry(group, ['summary', 'description']);
                  return (
                    <div key={String(group.id ?? index)} style={{ display: 'flex', flexDirection: 'column' }}>
                      {groupTitle ? <div style={{ ...compact.groupTitle, color: groupTitleColor ?? String(compact.accent.color) }}><InlineFormattedText value={groupTitle.value} /></div> : null}
                      {groupDescription ? <WysiwygContent dirtyHtml={groupDescription.value} /> : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {sectionKey && <SectionInsertSlot sectionKey={sectionKey} />}
        </div>
      </section>
    );
  }

  return (
    <section 
      className={`grid ${className || ''}`} 
      style={{
        ...style,
        fontSize: 'var(--font-size-body)',
        lineHeight: 'var(--line-height)',
        letterSpacing: 'var(--letter-spacing)',
        marginBottom: 'var(--section-spacing)',
      }}
    >
      <h4 
        className={titleClassName || "font-bold"}
        style={{ 
          color: 'var(--color-primary)',
          fontSize: 'var(--font-size-title)',
          marginBottom: 'var(--section-title-spacing)',
          paddingBottom: 'var(--section-title-spacing)',
          borderBottomWidth: 'var(--title-divider-width)',
          borderBottomStyle: 'solid',
          borderBottomColor: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4em',
        }}
      >
        {TitleIcon && <TitleIcon style={{ display: 'var(--title-icon-display)', flexShrink: 0, width: '1em', height: '1em' }} />}
        {title}
        {sectionKey && <SectionHandle sectionKey={sectionKey} title={title} />}
      </h4>
      <div 
        className={containerClassName || "grid gap-x-6 gap-y-3"}
        style={{ gap: 'var(--paragraph-spacing)' }}
      >
        {items.map((item, idx) => {
          const description = getFieldEntry(item, fieldMap.description);
          const itemId = item.id != null ? String(item.id) : null;
          return (
            <div className="space-y-2" key={itemId || idx}>
              <div>
                <div className="flex items-start">
                  <div className="flex-1 text-left">
                    <div className="font-bold"><EditableField item={item} field={fieldMap.mainTitle} sectionKey={sectionKey} label={title} /></div>
                    <div><EditableField item={item} field={fieldMap.mainSubtitle} sectionKey={sectionKey} label={title} /></div>
                    <div><EditableField item={item} field={fieldMap.secondarySubtitle} sectionKey={sectionKey} label={title} /></div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold"><EditableField item={item} field={fieldMap.sideTitle} sectionKey={sectionKey} label={title} /></div>
                    <div><EditableField item={item} field={fieldMap.sideSubtitle} sectionKey={sectionKey} label={title} /></div>
                    <div><EditableField item={item} field={fieldMap.secondarySideSubtitle} sectionKey={sectionKey} label={title} /></div>
                  </div>
                </div>
                {/* Hand-added fields, rendered explicitly rather than via the
                    fieldMap — see ListSection for why. */}
                {Array.isArray(item.customFields) && item.customFields.length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {item.customFields
                      .filter((f) => f?.name || f?.value)
                      .map((f) => (
                        <div key={f.id}>
                          {f.name ? <span className="font-medium">{f.name}</span> : null}
                          {f.name && f.value ? '：' : ''}
                          {f.value}
                        </div>
                      ))}
                  </div>
                )}
                {description &&
                  (sectionKey && itemId ? (
                    <Editable
                      target={{
                        sectionKey,
                        itemId,
                        fieldKey: description.key,
                        kind: 'html',
                        label: `${title} · 第 ${idx + 1} 条`,
                      }}
                      html={description.value}
                    />
                  ) : (
                    <WysiwygContent dirtyHtml={description.value} />
                  ))}
              </div>
            </div>
          );
        })}
        {sectionKey && <SectionInsertSlot sectionKey={sectionKey} />}
      </div>
    </section>
  );
});
