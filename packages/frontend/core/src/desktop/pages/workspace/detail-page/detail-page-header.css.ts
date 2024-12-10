import { style } from '@vanilla-extract/css';

export const root = style({
  position: 'relative',
  height: '100%',
  width: '100%',
});

export const header = style({
  display: 'flex',
  height: '100%',
  width: '100%',
  alignItems: 'center',
  gap: 12,
});
export const spacer = style({
  flexGrow: 1,
  minWidth: 12,
});
export const journalWeekPicker = style({
  minWidth: 100,
  flexGrow: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const iconButtonContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
});

export const dragHandle = style({
  cursor: 'grab',
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: -16,
  width: 16,
  opacity: 0,
  selectors: {
    [`${root}:hover &, ${root}[data-dragging="true"] &`]: {
      opacity: 1,
    },
  },
});
