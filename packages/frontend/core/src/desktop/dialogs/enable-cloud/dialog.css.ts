import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const dialogContainer = style({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  color: cssVarV2('text/primary'),
  padding: '16px',
});

export const mainIcon = style({
  width: 36,
  height: 36,
  color: cssVarV2('icon/primary'),
});

export const mainTitle = style({
  fontSize: '18px',
  lineHeight: '26px',
  textAlign: 'center',
  marginTop: '16px',
  fontWeight: 600,
});

export const desc = style({
  textAlign: 'center',
  color: cssVarV2('text/secondary'),
  marginBottom: '20px',
});

export const mainButton = style({
  width: '100%',
  fontSize: '14px',
  height: '42px',
});

export const modal = style({
  maxWidth: '352px',
});

export const workspaceSelector = style({
  margin: '0 -16px',
  width: 'calc(100% + 32px)',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  padding: '0 16px',
});

export const root = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  gap: '20px',
});

export const textContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
});

export const title = style({
  fontSize: cssVar('fontH6'),
  fontWeight: 600,
  lineHeight: '26px',
});

export const description = style({
  fontSize: cssVar('fontBase'),
  fontWeight: 400,
  lineHeight: '24px',
  color: cssVar('textSecondaryColor'),
});

export const serverSelector = style({
  width: '100%',
});

export const button = style({
  width: '100%',
  marginTop: '20px',
});
