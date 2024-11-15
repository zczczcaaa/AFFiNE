import { cssVarV2 } from '@toeverything/theme/v2';
import { createVar, style } from '@vanilla-extract/css';

const headerHeight = createVar('headerHeight');
const wsSelectorHeight = createVar('wsSelectorHeight');
const searchHeight = createVar('searchHeight');

export const root = style({
  vars: {
    [headerHeight]: '44px',
    [wsSelectorHeight]: '48px',
    [searchHeight]: '44px',
  },
  width: '100dvw',
});
export const headerSettingRow = style({
  display: 'flex',
  justifyContent: 'end',
  height: 44,
  paddingRight: 10,
});
export const wsSelectorAndSearch = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 15,
  padding: '4px 16px 15px 16px',
});

export const float = style({
  position: 'fixed',
  top: 0,
  width: '100%',
  background: cssVarV2('layer/background/mobile/primary'),
  zIndex: 1,

  display: 'flex',
  alignItems: 'center',
  padding: '4px 10px 4px 16px',
  gap: 10,

  // visibility control
  visibility: 'hidden',
  selectors: {
    '&.dense': {
      visibility: 'visible',
    },
  },
});
export const floatWsSelector = style({
  width: 0,
  flex: 1,
});
