import {
  BlockFlavourIdentifier,
  BlockServiceIdentifier,
  type ExtensionType,
  StdIdentifier,
} from '@blocksuite/affine/block-std';
import {
  AttachmentBlockService,
  AttachmentBlockSpec,
  ImageBlockService,
} from '@blocksuite/affine/blocks';

// bytes.parse('2GB')
const MAX_FILE_SIZE = 2147483648;

class CustomAttachmentBlockService extends AttachmentBlockService {
  override mounted(): void {
    // blocksuite default max file size is 10MB, we override it to 2GB
    // but the real place to limit blob size is CloudQuotaModal / LocalQuotaModal
    this.maxFileSize = MAX_FILE_SIZE;
    super.mounted();
  }
}

class CustomImageBlockService extends ImageBlockService {
  override mounted(): void {
    // blocksuite default max file size is 10MB, we override it to 2GB
    // but the real place to limit blob size is CloudQuotaModal / LocalQuotaModal
    this.maxFileSize = MAX_FILE_SIZE;
    super.mounted();
  }
}

export const CustomAttachmentBlockSpec: ExtensionType[] = [
  ...AttachmentBlockSpec,
  {
    setup: di => {
      di.override(
        BlockServiceIdentifier('affine:attachment'),
        CustomAttachmentBlockService,
        [StdIdentifier, BlockFlavourIdentifier('affine:attachment')]
      );
      di.override(
        BlockServiceIdentifier('affine:image'),
        CustomImageBlockService,
        [StdIdentifier, BlockFlavourIdentifier('affine:image')]
      );
    },
  },
];
