import type { FootNote } from '@blocksuite/affine-model';
import { DocDisplayMetaProvider } from '@blocksuite/affine-shared/services';
import { unsafeCSSVar, unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import type { BlockStdScope } from '@blocksuite/block-std';
import { WithDisposable } from '@blocksuite/global/utils';
import { DualLinkIcon, LinkIcon } from '@blocksuite/icons/lit';
import { css, html, LitElement, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

import { getAttachmentFileIcons } from '../../../../../icons';
import { RefNodeSlotsProvider } from '../../../../extension/ref-node-slots';

export class FootNotePopup extends WithDisposable(LitElement) {
  static override styles = css`
    .footnote-popup-container {
      border-radius: 4px;
      box-shadow: ${unsafeCSSVar('overlayPanelShadow')};
      border-radius: 4px;
      background-color: ${unsafeCSSVarV2('layer/background/primary')};
      border: 0.5px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
    }
  `;

  private readonly _prefixIcon = () => {
    const referenceType = this.footnote.reference.type;
    if (referenceType === 'doc') {
      const docId = this.footnote.reference.docId;
      if (!docId) {
        return undefined;
      }
      return this.std.get(DocDisplayMetaProvider).icon(docId).value;
    } else if (referenceType === 'attachment') {
      const fileType = this.footnote.reference.fileType;
      if (!fileType) {
        return undefined;
      }
      return getAttachmentFileIcons(fileType);
    }
    return undefined;
  };

  private readonly _suffixIcon = (): TemplateResult | undefined => {
    const referenceType = this.footnote.reference.type;
    if (referenceType === 'doc') {
      return DualLinkIcon({ width: '16px', height: '16px' });
    } else if (referenceType === 'url') {
      return LinkIcon({ width: '16px', height: '16px' });
    }
    return undefined;
  };

  private readonly _popupLabel = () => {
    const referenceType = this.footnote.reference.type;
    let label = '';
    const { docId, fileName, url } = this.footnote.reference;
    switch (referenceType) {
      case 'doc':
        if (!docId) {
          return label;
        }
        label = this.std.get(DocDisplayMetaProvider).title(docId).value;
        break;
      case 'attachment':
        if (!fileName) {
          return label;
        }
        label = fileName;
        break;
      case 'url':
        if (!url) {
          return label;
        }
        // TODO(@chen): get url title from url, need to implement after LinkPreviewer refactored as an extension
        label = url;
        break;
    }
    return label;
  };

  /**
   * When clicking the chip, we will navigate to the reference doc or open the url
   */
  private readonly _onChipClick = () => {
    const referenceType = this.footnote.reference.type;
    const { docId, url } = this.footnote.reference;
    switch (referenceType) {
      case 'doc':
        if (!docId) {
          break;
        }
        this.std
          .getOptional(RefNodeSlotsProvider)
          ?.docLinkClicked.emit({ pageId: docId });
        break;
      case 'url':
        if (!url) {
          break;
        }
        window.open(url, '_blank');
        break;
    }
    this.abortController.abort();
  };

  override render() {
    return html`
      <div class="footnote-popup-container">
        <footnote-popup-chip
          .prefixIcon=${this._prefixIcon()}
          .label=${this._popupLabel()}
          .suffixIcon=${this._suffixIcon()}
          .onClick=${this._onChipClick}
        ></footnote-popup-chip>
      </div>
    `;
  }

  @property({ attribute: false })
  accessor footnote!: FootNote;

  @property({ attribute: false })
  accessor std!: BlockStdScope;

  @property({ attribute: false })
  accessor abortController!: AbortController;
}
