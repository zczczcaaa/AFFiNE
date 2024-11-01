import { Entity } from '../../../framework';
import { LiveData } from '../../../livedata';

export class AppTheme extends Entity {
  theme$ = new LiveData<string | undefined>(undefined);
}
