import type { CodeBlockConfig } from '@blocksuite/affine-block-code';
import { ParagraphBlockService } from '@blocksuite/affine-block-paragraph';
import {
  type ReferenceNodeConfig,
  ReferenceNodeConfigIdentifier,
} from '@blocksuite/affine-components/rich-text';
import { FeatureFlagService } from '@blocksuite/affine-shared/services';
import {
  type BlockStdScope,
  ConfigIdentifier,
  LifeCycleWatcher,
} from '@blocksuite/block-std';
import type { Container } from '@blocksuite/global/di';

export class MobileSpecsPatches extends LifeCycleWatcher {
  static override key = 'mobile-patches';

  constructor(std: BlockStdScope) {
    super(std);
    const featureFlagService = std.get(FeatureFlagService);

    featureFlagService.setFlag('enable_mobile_keyboard_toolbar', true);
    featureFlagService.setFlag('enable_mobile_linked_doc_menu', true);
  }

  static override setup(di: Container) {
    super.setup(di);

    // Hide reference popup on mobile.
    {
      const prev = di.getFactory(ReferenceNodeConfigIdentifier);
      di.override(ReferenceNodeConfigIdentifier, provider => {
        return {
          ...prev?.(provider),
          hidePopup: true,
        } satisfies ReferenceNodeConfig;
      });
    }

    // Hide number lines for code block on mobile.
    {
      const codeConfigIdentifier = ConfigIdentifier('affine:code');
      const prev = di.getFactory(codeConfigIdentifier);
      di.override(codeConfigIdentifier, provider => {
        return {
          ...prev?.(provider),
          showLineNumbers: false,
        } satisfies CodeBlockConfig;
      });
    }
  }

  override mounted() {
    // remove slash placeholder for mobile: `type / ...`
    {
      const paragraphService = this.std.get(ParagraphBlockService);
      if (!paragraphService) return;

      paragraphService.placeholderGenerator = model => {
        const placeholders = {
          text: '',
          h1: 'Heading 1',
          h2: 'Heading 2',
          h3: 'Heading 3',
          h4: 'Heading 4',
          h5: 'Heading 5',
          h6: 'Heading 6',
          quote: '',
        };
        return placeholders[model.type];
      };
    }
  }
}
