import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';

import { sonner } from './styles.css';

export function MobileNotificationCenter() {
  const theme = useTheme();
  const resolvedTheme = theme.resolvedTheme as 'light' | 'dark';

  return (
    <Toaster
      className={sonner}
      visibleToasts={1}
      position="top-center"
      style={{
        width: '100%',
        top: 'calc(env(safe-area-inset-top) + 16px)',
        pointerEvents: 'auto',
      }}
      theme={resolvedTheme}
    />
  );
}
