export { AppThemeService } from './services/theme';

import type { Framework } from '../../framework';
import { AppTheme } from './entities/theme';
import { AppThemeService } from './services/theme';

export function configureAppThemeModule(framework: Framework) {
  framework.service(AppThemeService).entity(AppTheme);
}
