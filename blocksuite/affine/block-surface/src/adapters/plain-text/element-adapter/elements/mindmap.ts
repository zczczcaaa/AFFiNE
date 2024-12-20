import { getMindMapTreeText } from '../../../utils/text.js';
import type { ElementModelToPlainTextAdapterMatcher } from '../type.js';

export const mindmapToPlainTextAdapterMatcher: ElementModelToPlainTextAdapterMatcher =
  {
    name: 'mindmap',
    match: elementModel => elementModel.type === 'mindmap',
    toAST: (elementModel, context) => {
      const mindMapContent = getMindMapTreeText(elementModel, context.elements);
      return { content: mindMapContent };
    },
  };
