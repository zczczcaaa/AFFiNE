import { createIdentifier } from '@toeverything/infra';

export interface ClientSchemaProvider {
  /**
   * Get the client schema in the current environment, used for the user to complete the authentication process in the browser and redirect back to the app.
   */
  getClientSchema(): string | undefined;
}

export const ClientSchemaProvider = createIdentifier<ClientSchemaProvider>(
  'ClientSchemaProvider'
);
