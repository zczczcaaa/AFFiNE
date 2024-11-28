import {
  bodyEmphasized,
  bodyRegular,
  footnoteRegular,
} from '@toeverything/theme/typography';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const dialog = style({
  padding: '0 !important',
  background: cssVarV2('layer/background/mobile/primary'),
});
export const root = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100dvh',
});
export const header = style({
  background: `${cssVarV2('layer/background/mobile/primary')} !important`,
});
export const dialogTitle = style([bodyEmphasized, {}]);
export const scrollArea = style({
  height: 0,
  flex: 1,
});

export const content = style({
  padding: '24px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

// item
export const itemBlock = style([
  bodyRegular,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '19px 12px',
    background: cssVarV2('layer/background/mobile/secondary'),
    borderRadius: 12,
  },
]);
export const itemDescription = style([
  footnoteRegular,
  {
    marginTop: 4,
    color: cssVarV2('text/tertiary'),
  },
]);
