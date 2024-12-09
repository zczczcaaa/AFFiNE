import { createContext } from 'react';

import type { DNDData, ExternalDataAdapter } from './types';

export const DNDContext = createContext<{
  /**
   * external data adapter.
   * if this is provided, the drop target will handle external elements as well.
   *
   * @default undefined
   */
  externalDataAdapter?: ExternalDataAdapter<DNDData>;
}>({});
