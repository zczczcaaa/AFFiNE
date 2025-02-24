import { toReactNode } from '@affine/component';
import { AIChatBlockPeekViewTemplate } from '@affine/core/blocksuite/ai';
import type { AIChatBlockModel } from '@affine/core/blocksuite/ai/blocks/ai-chat-block/model/ai-chat-model';
import { createPageModePreviewSpecs } from '@affine/core/blocksuite/block-suite-editor/specs/preview';
import { AINetworkSearchService } from '@affine/core/modules/ai-button/services/network-search';
import type { EditorHost } from '@blocksuite/affine/block-std';
import { FootNoteNodeConfigExtension } from '@blocksuite/affine/blocks';
import { useFramework } from '@toeverything/infra';
import { useMemo } from 'react';

export type AIChatBlockPeekViewProps = {
  model: AIChatBlockModel;
  host: EditorHost;
};

// Disable hover effect for footnote node in center peek preview mode
const FOOTNOTE_CONFIG = FootNoteNodeConfigExtension({
  disableHoverEffect: true,
});

export const AIChatBlockPeekView = ({
  model,
  host,
}: AIChatBlockPeekViewProps) => {
  const framework = useFramework();
  const searchService = framework.get(AINetworkSearchService);
  return useMemo(() => {
    const previewSpecBuilder = createPageModePreviewSpecs(framework);
    previewSpecBuilder.extend([FOOTNOTE_CONFIG]);
    const networkSearchConfig = {
      visible: searchService.visible,
      enabled: searchService.enabled,
      setEnabled: searchService.setEnabled,
    };
    const template = AIChatBlockPeekViewTemplate(
      model,
      host,
      previewSpecBuilder,
      networkSearchConfig
    );
    return toReactNode(template);
  }, [framework, model, host, searchService]);
};
