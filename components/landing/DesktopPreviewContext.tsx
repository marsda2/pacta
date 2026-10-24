import { createContext, useContext } from 'react';

export const DesktopPreviewContext = createContext<(() => void) | null>(null);

export function useDesktopPreview() {
  const startPreview = useContext(DesktopPreviewContext);
  if (!startPreview) throw new Error('Desktop preview requires the root layout.');
  return startPreview;
}
