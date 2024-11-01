import { Service } from '../../../framework';
import { AppTheme } from '../entities/theme';

export class AppThemeService extends Service {
  appTheme = this.framework.createEntity(AppTheme);
}
