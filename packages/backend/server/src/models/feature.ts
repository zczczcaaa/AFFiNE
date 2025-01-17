import { Injectable } from '@nestjs/common';
import { Feature } from '@prisma/client';
import { z } from 'zod';

import { PrismaTransaction } from '../base';
import { BaseModel } from './base';
import { Features, FeatureType } from './common';

type FeatureNames = keyof typeof Features;
type FeatureConfigs<T extends FeatureNames> = z.infer<
  (typeof Features)[T]['shape']['configs']
>;

// TODO(@forehalo):
//   `version` column in `features` table will deprecated because it's makes the whole system complicated without any benefits.
//   It was brought to introduce a version control for features, but the version controlling is not and will not actually needed.
//   It even makes things harder when a new version of an existing feature is released.
//   We have to manually update all the users and workspaces binding to the latest version, which are thousands of handreds.
//   This is a huge burden for us and we should remove it.
@Injectable()
export class FeatureModel extends BaseModel {
  async get<T extends FeatureNames>(name: T) {
    const feature = await this.getLatest(this.db, name);

    // All features are hardcoded in the codebase
    // It would be a fatal error if the feature is not found in DB.
    if (!feature) {
      throw new Error(`Feature ${name} not found`);
    }

    const shape = this.getConfigShape(name);
    const parseResult = shape.safeParse(feature.configs);

    if (!parseResult.success) {
      throw new Error(`Invalid feature config for ${name}`, {
        cause: parseResult.error,
      });
    }

    return {
      ...feature,
      configs: parseResult.data as FeatureConfigs<T>,
    };
  }

  async upsert<T extends FeatureNames>(name: T, configs: FeatureConfigs<T>) {
    const shape = this.getConfigShape(name);
    const parseResult = shape.safeParse(configs);

    if (!parseResult.success) {
      throw new Error(`Invalid feature config for ${name}`, {
        cause: parseResult.error,
      });
    }

    const parsedConfigs = parseResult.data;

    // TODO(@forehalo):
    //   could be a simple upsert operation, but we got useless `version` column in the database
    //   will be fixed when `version` column gets deprecated
    const feature = await this.db.$transaction(async tx => {
      const latest = await this.getLatest(tx, name);

      if (!latest) {
        return await tx.feature.create({
          data: {
            type: FeatureType.Feature,
            feature: name,
            configs: parsedConfigs,
          },
        });
      } else {
        return await tx.feature.update({
          where: { id: latest.id },
          data: {
            configs: parsedConfigs,
          },
        });
      }
    });

    this.logger.verbose(`Feature ${name} upserted`);

    return feature as Feature & { configs: FeatureConfigs<T> };
  }

  private async getLatest<T extends FeatureNames>(
    client: PrismaTransaction,
    name: T
  ) {
    return client.feature.findFirst({
      where: { feature: name },
      orderBy: { version: 'desc' },
    });
  }

  private getConfigShape(name: FeatureNames): z.ZodObject<any> {
    return Features[name]?.shape.configs ?? z.object({});
  }
}
