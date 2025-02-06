import { Type } from '@nestjs/common';
import { Field, ObjectType } from '@nestjs/graphql';

import { ApplyType } from '../utils/types';

export function registerObjectType<T>(
  fields: Record<string, Type<any>>,
  options: {
    name: string;
  }
) {
  const Inner = ApplyType<T>();
  for (const [key, value] of Object.entries(fields)) {
    Field(() => value)(Inner.prototype, key);
  }

  ObjectType(options.name)(Inner);

  return Inner;
}
