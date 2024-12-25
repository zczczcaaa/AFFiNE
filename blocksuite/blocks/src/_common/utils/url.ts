import {
  type DocMode,
  DocModes,
  type ReferenceInfo,
} from '@blocksuite/affine-model';

export function extractSearchParams(link: string) {
  try {
    const url = new URL(link);
    const mode = url.searchParams.get('mode') as DocMode | undefined;

    if (mode && DocModes.includes(mode)) {
      const params: ReferenceInfo['params'] = { mode: mode as DocMode };
      const blockIds = url.searchParams
        .get('blockIds')
        ?.trim()
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length);
      const elementIds = url.searchParams
        .get('elementIds')
        ?.trim()
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length);

      if (blockIds?.length) {
        params.blockIds = blockIds;
      }

      if (elementIds?.length) {
        params.elementIds = elementIds;
      }

      return { params };
    }
  } catch (err) {
    console.error(err);
  }

  return null;
}
