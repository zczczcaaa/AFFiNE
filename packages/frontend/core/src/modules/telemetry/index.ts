import { type Framework, GlobalContextService } from '@toeverything/infra';

import { ServersService } from '../cloud/services/servers';
import { TelemetryService } from './services/telemetry';

export function configureTelemetryModule(framework: Framework) {
  framework.service(TelemetryService, [ServersService, GlobalContextService]);
}
