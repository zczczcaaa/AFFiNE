import { resolve as rs } from 'node:path';
import { fileURLToPath } from 'node:url';

import json from './package.json' with { type: 'json' };

const ROOT_PATH = rs(fileURLToPath(import.meta.url), '../../../');

const importsMap = json.bsImport;

export async function resolve(specifier, context, defaultResolve) {
  if (importsMap[specifier]) {
    const remapped = importsMap[specifier];
    return defaultResolve(
      rs(ROOT_PATH, './node_modules', remapped),
      context,
      defaultResolve
    );
  }
  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  return defaultLoad(url, context, defaultLoad);
}
