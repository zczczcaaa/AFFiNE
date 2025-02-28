import type {
  DropdownMenuContentProps,
  DropdownMenuItemProps as MenuItemPropsPrimitive,
  DropdownMenuPortalProps,
  DropdownMenuProps,
  DropdownMenuSubContentProps,
  DropdownMenuSubProps,
} from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';

export interface MenuProps {
  children: ReactNode;
  items: ReactNode;
  title?: string;
  portalOptions?: Omit<DropdownMenuPortalProps, 'children'>;
  rootOptions?: Omit<DropdownMenuProps, 'children'>;
  contentOptions?: Omit<DropdownMenuContentProps, 'children'>;
  noPortal?: boolean;
}

export interface MenuItemProps
  extends Omit<MenuItemPropsPrimitive, 'asChild' | 'textValue' | 'prefix'> {
  type?: 'default' | 'warning' | 'danger';
  prefix?: ReactNode;
  suffix?: ReactNode;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  prefixIconClassName?: string;
  suffixIconClassName?: string;
  checked?: boolean;
  selected?: boolean;
  block?: boolean;
  /**
   * add divider after item (if not last one)
   * - Mobile only for now
   */
  divide?: boolean;
}
export interface MenuSubProps {
  children: ReactNode;
  items: ReactNode;
  triggerOptions?: Omit<MenuItemProps, 'onSelect' | 'children'> & {
    [key: `data-${string}`]: string;
  };
  portalOptions?: Omit<DropdownMenuPortalProps, 'children'>;
  subOptions?: Omit<DropdownMenuSubProps, 'children'>;
  subContentOptions?: Omit<DropdownMenuSubContentProps, 'children'>;
}
