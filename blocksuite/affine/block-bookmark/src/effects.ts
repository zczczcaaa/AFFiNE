import { BookmarkBlockComponent } from './bookmark-block';
import { BookmarkEdgelessBlockComponent } from './bookmark-edgeless-block';
import type { BookmarkBlockService } from './bookmark-service';
import type { insertBookmarkCommand } from './commands/insert-bookmark';
import type { insertLinkByQuickSearchCommand } from './commands/insert-link-by-quick-search';
import { BookmarkCard } from './components/bookmark-card';

export function effects() {
  customElements.define(
    'affine-edgeless-bookmark',
    BookmarkEdgelessBlockComponent
  );
  customElements.define('affine-bookmark', BookmarkBlockComponent);
  customElements.define('bookmark-card', BookmarkCard);
}

declare global {
  namespace BlockSuite {
    interface Commands {
      insertBookmark: typeof insertBookmarkCommand;
      insertLinkByQuickSearch: typeof insertLinkByQuickSearchCommand;
    }
    interface BlockServices {
      'affine:bookmark': BookmarkBlockService;
    }
  }
}
