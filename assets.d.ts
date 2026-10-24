// Imports de imágenes (logos e iconos de marca) como fuente de <Image />.
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';

  const source: ImageSourcePropType;
  export default source;
}
