import { style } from '@vanilla-extract/css';

export const list = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const menuContent = style({
  width: 280,
  paddingRight: 0,
});
export const scrollableViewport = style({
  paddingRight: 8,
  maxHeight: 360,
});
