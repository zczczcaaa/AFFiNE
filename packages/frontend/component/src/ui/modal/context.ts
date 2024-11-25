import { createContext } from 'react';

export interface ModalConfig {
  /**
   * add global callback for modal open/close
   */
  onOpenChange?: (open: boolean) => void;
}
export const ModalConfigContext = createContext<ModalConfig>({});

export const InsideModalContext = createContext<number>(0);
