import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Reduce la foto antes de subirla: máx. 1024 px de ancho, JPEG al 60 %. Devuelve base64 sin cabecera.
export async function prepareProofImage(uri: string): Promise<string> {
  const result = await manipulateAsync(uri, [{ resize: { width: 1024 } }], {
    compress: 0.6,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('No se pudo preparar la imagen');
  return result.base64;
}
