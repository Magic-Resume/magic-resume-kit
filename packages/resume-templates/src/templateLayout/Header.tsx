import React from 'react';
import { InfoType } from '../types/resume';
import { Globe, Mail, MapPin, Phone } from '@magic-resume-kit/icons';
import { documentLabel } from '@magic-resume-kit/resume-schema';
import { Editable } from '../renderer/EditableCanvas';
import { safeHref } from './utils';
import { sectionIconByName } from '../sectionIcons';
import { InlineFormattedText } from '../renderer/InlineFormattedText';
import { compactPresentationStyles, type CompactPresentationProps } from './compactPresentation';

interface Props extends CompactPresentationProps {
  data: InfoType;
  locale?: string;
  style?: React.CSSProperties;
  className?: string;
  avatarPosition?: 'left' | 'right';
  avatarWidth?: number;
  avatarHeight?: number;
  avatarRounded?: boolean;
  contactStyle?: 'icon' | 'label';
  showCustomFields?: boolean;
}

const ContactIcons = {
  location: <MapPin className="w-2.5 h-2.5" style={{ color: 'var(--color-primary)' }} />,
  phone: <Phone className="w-2.5 h-2.5" style={{ color: 'var(--color-primary)' }} />,
  email: <Mail className="w-2.5 h-2.5" style={{ color: 'var(--color-primary)' }} />,
  website: <Globe className="w-2.5 h-2.5" style={{ color: 'var(--color-primary)' }} />
};

export const Header = React.memo(function Header({
  data: info,
  locale,
  style,
  className,
  avatarPosition = 'left',
  avatarWidth = 40,
  avatarHeight = 40,
  avatarRounded = true,
  contactStyle = 'icon',
  // 自定义基本信息是 Resume 的通用数据，不应只在两个示例模板里可见。
  // 模板仍可显式传 false，给极简版式保留收起的选择。
  showCustomFields = true,
  presentation,
  designTokens,
}: Props) {
  const avatarClassName = avatarRounded
    ? 'rounded-full'
    : 'rounded-md';

  const isRightAvatarLayout = avatarPosition === 'right';

  const avatarNode = info.avatar ? (
    // 原生 img:头像可能是 R2 URL / 自定义域名 / data:URL,不走 next/image
    // 的域名白名单,任意来源都能渲染(与 PDF/表单预览一致)。
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={info.avatar}
      alt={documentLabel('avatar', locale)}
      width={avatarWidth}
      height={avatarHeight}
      className={`${avatarClassName} object-cover border shrink-0`}
      style={{
        width: `${avatarWidth}px`,
        height: `${avatarHeight}px`,
        background: 'var(--color-background)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
      }}
    />
  ) : null;

  const contactItems: Array<{
    key: string;
    icon: React.ReactElement;
    label: string;
    content: string;
    href?: string;
    external?: boolean;
  }> = [];

  if (info.phoneNumber) {
    contactItems.push({
      key: 'phone',
      icon: ContactIcons.phone,
      label: documentLabel('phone', locale),
      content: info.phoneNumber,
      href: `tel:${info.phoneNumber}`,
    });
  }
  if (info.email) {
    contactItems.push({
      key: 'email',
      icon: ContactIcons.email,
      label: documentLabel('email', locale),
      content: info.email,
      href: `mailto:${info.email}`,
    });
  }
  if (info.address) {
    contactItems.push({
      key: 'address',
      icon: ContactIcons.location,
      label: documentLabel('address', locale),
      content: info.address,
    });
  }
  if (info.website) {
    const websiteHref = safeHref(info.website);
    contactItems.push({
      key: 'website',
      icon: ContactIcons.website,
      label: documentLabel('website', locale),
      content: info.website,
      href: websiteHref ?? undefined,
      external: Boolean(websiteHref),
    });
  }

  const customFieldItems = (showCustomFields ? (info.customFields || []) : [])
    .filter(field => field && (presentation === 'compact'
      ? field.name?.trim() || field.value?.trim()
      : field.name?.trim() && field.value?.trim()))
    .map((field, index) => {
      const value = presentation === 'compact' ? field.value?.trim() || '' : field.value.trim();
      const href = safeHref(value) ?? undefined;
      const Icon = sectionIconByName(field.icon);
      return {
        key: field.id || `custom-${index}`,
        custom: true as const,
        label: presentation === 'compact' ? field.name?.trim() || '' : field.name.trim(),
        content: value,
        href,
        external: Boolean(href),
        ...(Icon
          ? {
              icon: <Icon className="w-2.5 h-2.5" style={{ color: 'var(--color-primary)' }} />,
            }
          : {}),
      };
    });

  if (presentation === 'compact') {
    const compact = compactPresentationStyles(designTokens);
    type ContactItem = (typeof contactItems)[number] | (typeof customFieldItems)[number];
    const renderContact = (item: ContactItem) => {
      const custom = 'custom' in item;
      const fieldKey = item.key === 'phone' ? 'phoneNumber' : item.key;
      const content = custom ? <InlineFormattedText value={item.content} /> : (
        <Editable target={{ sectionKey: 'info', itemId: '', fieldKey, kind: 'text', label: item.label }} text={item.content} />
      );
      const icon = item.icon && (custom || contactStyle === 'icon')
        ? React.cloneElement(item.icon as React.ReactElement<{ className?: string; style?: React.CSSProperties }>, {
          className: undefined,
          style: { ...compact.headerContactIcon, width: custom ? 15 : 17, height: custom ? 15 : 17, color: String(compact.muted.color) },
        })
        : null;
      return (
        <div key={item.key} style={{ display: 'flex', ...compact.contact, ...compact.muted }}>
          {icon}
          {(custom || contactStyle === 'label') && item.label ? (
            <div style={{ ...compact.contactValue, flexBasis: 'auto', flexGrow: 0, maxWidth: '40%' }}>
              <span style={compact.contactText}><InlineFormattedText value={`${item.label}：`} /></span>
            </div>
          ) : null}
          <div style={compact.contactValue}>
            {item.href ? (
              <a href={item.href} target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer noopener nofollow' : undefined}
                style={{ ...compact.contactText, overflowWrap: 'anywhere' }}>{content}</a>
            ) : <span style={compact.contactText}>{content}</span>}
          </div>
        </div>
      );
    };
    const roleField = info.headline ? 'headline' : 'fullName';
    const role = (
      <div style={compact.role}>
        <Editable target={{ sectionKey: 'info', itemId: '', fieldKey: roleField, kind: 'text', label: documentLabel('yourName', locale) }}
          text={info.headline || info.fullName || documentLabel('yourName', locale)} />
      </div>
    );
    return (
      <div className={className} style={{ ...style, display: 'flex', flexDirection: 'column', ...compact.body, ...compact.header, fontFamily: 'var(--font-family-primary)' }}>
        {avatarNode ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            {avatarPosition === 'left' && avatarNode}{role}{avatarPosition === 'right' && avatarNode}
          </div>
        ) : role}
        <div style={{ display: 'flex', ...compact.contacts }}>
          <div style={{ display: 'flex', flexDirection: 'column', flexBasis: 0, flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
            {info.fullName ? <div><Editable target={{ sectionKey: 'info', itemId: '', fieldKey: 'fullName', kind: 'text', label: documentLabel('yourName', locale) }} text={info.fullName} /></div> : null}
            {contactItems.filter((item) => item.key !== 'website').map(renderContact)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexBasis: 0, flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
            {contactItems.filter((item) => item.key === 'website').map(renderContact)}
            {customFieldItems.map(renderContact)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-start justify-between gap-4 ${className || ''}`} 
      style={{
        ...style,
        lineHeight: 'var(--line-height)',
        letterSpacing: 'var(--letter-spacing)',
        fontFamily: 'var(--font-family-primary)',
      }}
    >
      {avatarPosition === 'left' && avatarNode}
      <div className="space-y-1 flex-1 min-w-0">
        <div
          className={contactStyle === 'label' ? 'text-xl font-bold' : (isRightAvatarLayout ? 'text-base font-bold' : 'text-sm font-bold')}
          style={{ color: 'var(--color-text)' }}
        >
          {info.fullName || documentLabel('yourName', locale)}
        </div>
        {info.headline && (
          <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <Editable
              target={{ sectionKey: 'info', itemId: '', fieldKey: 'headline', kind: 'text', label: '个人摘要' }}
              text={info.headline}
            />
          </div>
        )}
        {contactStyle === 'label' ? (
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]"
            style={{
              lineHeight: 'var(--line-height)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {[...contactItems, ...customFieldItems].map(item => (
              <div key={item.key} className="truncate" style={{ color: 'var(--color-text)' }}>
                {'custom' in item && item.icon ? (
                  <span className="mr-1 inline-flex align-middle">{item.icon}</span>
                ) : null}
                <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}：</span>
                {item.href ? (
                  <a
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noreferrer noopener nofollow" : undefined}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {item.content}
                  </a>
                ) : (
                  item.content
                )}
              </div>
            ))}
          </div>
        ) : (
          <div 
            className={`flex flex-wrap items-center gap-y-1 ${isRightAvatarLayout ? 'gap-x-1.5 text-[11px]' : 'gap-x-2 text-[10px]'}`}
            style={{ 
              lineHeight: 'var(--line-height)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {[...contactItems, ...customFieldItems].map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 && (
                  <span style={{ color: 'var(--color-border)' }}>|</span>
                )}
                {'icon' in item ? (
                  <div className="flex items-center gap-x-1">
                    <div className="flex items-center">{item.icon}</div>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noreferrer noopener nofollow" : undefined}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {item.content}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--color-text)' }}>{item.content}</span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: 'var(--color-text)' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}：</span>
                    {item.href ? (
                      <a
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noreferrer noopener nofollow" : undefined}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {item.content}
                      </a>
                    ) : (
                      item.content
                    )}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      {avatarPosition === 'right' && <div className="shrink-0">{avatarNode}</div>}
    </div>
  );
});
