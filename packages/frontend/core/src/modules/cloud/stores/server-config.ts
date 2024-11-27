import {
  type OauthProvidersQuery,
  oauthProvidersQuery,
  type ServerConfigQuery,
  serverConfigQuery,
  ServerFeature,
} from '@affine/graphql';
import { Store } from '@toeverything/infra';

import type { GraphQLService } from '../services/graphql';

export type ServerConfigType = ServerConfigQuery['serverConfig'] &
  OauthProvidersQuery['serverConfig'];

export class ServerConfigStore extends Store {
  constructor(private readonly gqlService: GraphQLService) {
    super();
  }

  async fetchServerConfig(
    abortSignal?: AbortSignal
  ): Promise<ServerConfigType> {
    const serverConfigData = await this.gqlService.gql({
      query: serverConfigQuery,
      context: {
        signal: abortSignal,
      },
    });
    if (serverConfigData.serverConfig.features.includes(ServerFeature.OAuth)) {
      const oauthProvidersData = await this.gqlService.gql({
        query: oauthProvidersQuery,
        context: {
          signal: abortSignal,
        },
      });
      return {
        ...serverConfigData.serverConfig,
        ...oauthProvidersData.serverConfig,
      };
    }
    return { ...serverConfigData.serverConfig, oauthProviders: [] };
  }
}
