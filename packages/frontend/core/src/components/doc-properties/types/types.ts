import type { DocCustomPropertyInfo } from '@toeverything/infra';

export interface PropertyValueProps {
  propertyInfo?: DocCustomPropertyInfo;
  value: any;
  onChange: (value: any) => void;
}

export type PageLayoutMode = 'standard' | 'fullWidth';
