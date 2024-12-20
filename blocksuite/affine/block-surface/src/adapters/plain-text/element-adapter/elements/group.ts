import { getGroupTitle } from '../../../utils/text.js';
import type { ElementModelToPlainTextAdapterMatcher } from '../type.js';

export const groupToPlainTextAdapterMatcher: ElementModelToPlainTextAdapterMatcher =
  {
    name: 'group',
    match: elementModel => elementModel.type === 'group',
    toAST: elementModel => {
      const title = getGroupTitle(elementModel);
      const content = `Group, with title "${title}"`;
      return { content };
    },
  };
