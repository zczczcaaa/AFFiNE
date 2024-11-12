import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const virtuoso = style({
  width: '100%',
});

export const virtuosoList = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '20px',
  selectors: {
    '&.small-gap': {
      gap: '12px',
    },
  },
});

export const virtuosoItem = style({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const pdfPage = style({
  overflow: 'hidden',
  maxWidth: 'calc(100% - 40px)',
  background: cssVarV2('layer/white'),
  boxSizing: 'border-box',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: cssVarV2('layer/insideBorder/border'),
  boxShadow:
    '0px 4px 20px 0px var(--transparent-black-200, rgba(0, 0, 0, 0.10))',
});

export const pdfPageError = style({
  display: 'flex',
  alignSelf: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  textWrap: 'wrap',
  width: '100%',
  wordBreak: 'break-word',
  fontSize: 14,
  lineHeight: '22px',
  fontWeight: 400,
  color: cssVarV2('text/primary'),
});

export const pdfPageCanvas = style({
  width: '100%',
});

export const pdfLoading = style({
  display: 'flex',
  alignSelf: 'center',
  width: '100%',
  height: '100%',
  maxWidth: '537px',
});
