import { useGlobalEvent } from '@affine/core/mobile/hooks/use-global-events';
import type { DocMeta } from '@blocksuite/affine/store';
import { useCallback, useMemo, useState } from 'react';

import { calcRowsById, DocCard } from '../../../components';
import * as styles from './masonry.css';

const calcColumnCount = () => {
  const maxCardWidth = 220;
  const windowWidth = window.innerWidth;
  const newColumnCount = Math.floor(
    (windowWidth - styles.paddingX * 2 - styles.columnGap) / maxCardWidth
  );
  return Math.max(newColumnCount, 2);
};

const calcColumns = (items: DocMeta[], length: number) => {
  const columns = Array.from({ length }, () => [] as DocMeta[]);
  const heights = Array.from({ length }, () => 0);

  items.forEach(item => {
    const itemHeight = calcRowsById(item.id);
    const minHeightIndex = heights.indexOf(Math.min(...heights));
    heights[minHeightIndex] += itemHeight;
    columns[minHeightIndex].push(item);
  });

  return columns;
};

export const MasonryDocs = ({
  items,
  showTags,
}: {
  items: DocMeta[];
  showTags?: boolean;
}) => {
  const [columnCount, setColumnCount] = useState(calcColumnCount);

  const updateColumnCount = useCallback(() => {
    setColumnCount(calcColumnCount());
  }, []);
  useGlobalEvent('resize', updateColumnCount);

  const columns = useMemo(
    () => calcColumns(items, columnCount),
    [items, columnCount]
  );

  return (
    <div className={styles.columns}>
      {columns.map((col, index) => (
        <div key={`${columnCount}-${index}`} className={styles.column}>
          {col.map(item => (
            <DocCard
              key={item.id}
              showTags={showTags}
              meta={item}
              autoHeightById
            />
          ))}
        </div>
      ))}
    </div>
  );
};
