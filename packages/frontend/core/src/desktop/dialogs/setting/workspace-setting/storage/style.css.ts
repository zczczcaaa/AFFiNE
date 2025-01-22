import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { globalStyle, style } from '@vanilla-extract/css';

export const storageProgressContainer = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});
export const storageProgressWrapper = style({
  flexGrow: 1,
});
globalStyle(`${storageProgressWrapper} .storage-progress-desc`, {
  fontSize: cssVar('fontXs'),
  color: cssVarV2('text/secondary'),
  height: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 2,
});
globalStyle(`${storageProgressWrapper} .storage-progress-bar-wrapper`, {
  height: '8px',
  borderRadius: '4px',
  backgroundColor: cssVarV2('layer/background/hoverOverlay'),
  overflow: 'hidden',
});
export const storageProgressBar = style({
  height: '100%',
});
