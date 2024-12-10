import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';
export const profileWrapper = style({
  display: 'flex',
  alignItems: 'flex-end',
  marginTop: '12px',
});

export const labelWrapper = style({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  marginTop: '24px',
  gap: '10px',
  flexWrap: 'wrap',
});

export const label = style({
  fontSize: cssVar('fontXs'),
  color: cssVarV2('text/secondary'),
  marginBottom: '5px',
});
export const workspaceLabel = style({
  width: '100%',
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: '6px',
  padding: '2px 10px',
  border: `1px solid ${cssVar('white30')}`,
  fontSize: cssVar('fontXs'),
  color: cssVarV2('text/primary'),
  lineHeight: '20px',
  whiteSpace: 'nowrap',
});
