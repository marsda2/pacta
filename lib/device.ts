import { Platform, useWindowDimensions } from 'react-native';

// A partir de este ancho, en la web, se trata como escritorio.
export const DESKTOP_MIN_WIDTH = 900;

// PACTA se usa desde el móvil (cámara en vivo, ubicación). En la web de escritorio
// (ventana ancha y puntero preciso) se muestra una landing en lugar de la app.
export function useIsDesktopWeb() {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < DESKTOP_MIN_WIDTH) return false;
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  return !touch;
}

// Rutas que sí tienen sentido en escritorio: el testigo invitado, el jurado y la galería.
const DESKTOP_PATHS = ['/witness', '/jury', '/kit'];

export function isDesktopPath(pathname: string) {
  return DESKTOP_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
