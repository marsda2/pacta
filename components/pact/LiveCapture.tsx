import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import { colors, radii } from '@/lib/theme';

export interface Capture {
  // Sin uri = captura de demostración (sin cámara disponible).
  uri?: string;
}

interface LiveCaptureProps {
  capture: Capture | null;
  onChange: (capture: Capture | null) => void;
  dayCode?: string;
}

// Captura en vivo: solo cámara, sin galería (docs/01). Si no hay cámara, modo demo.
export function LiveCapture({ capture, onChange, dayCode }: LiveCaptureProps) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);

  const shoot = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.6 });
      onChange({ uri: photo?.uri });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        {capture ? (
          capture.uri ? (
            <Image source={{ uri: capture.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient colors={[colors.mint, colors.aqua]} style={[StyleSheet.absoluteFill, styles.center]}>
              <Icon name="camera" size={40} />
              <Text variant="bodyStrong">Demo capture</Text>
              <Text variant="caption" color="muted">No camera available, using a placeholder</Text>
            </LinearGradient>
          )
        ) : permission?.granted ? (
          <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} enableTorch={torch} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.subtle }]}>
            <Icon name="camera" size={32} color={colors.muted} />
            <Text variant="small" color="muted" style={styles.hint}>
              {permission ? 'Allow the camera to take your proof live.' : 'Checking the camera…'}
            </Text>
            <View style={styles.actions}>
              {permission && permission.canAskAgain ? <Button label="Allow camera" variant="mint" fullWidth={false} onPress={() => requestPermission()} /> : null}
              <Button label="Use demo photo" variant="outline" fullWidth={false} onPress={() => onChange({})} />
            </View>
          </View>
        )}

        {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
          <View key={corner} pointerEvents="none" style={[styles.corner, cornerStyle[corner]]} />
        ))}
        {dayCode ? (
          <View style={styles.codeOverlay}>
            <Text variant="caption" color="white" style={{ fontWeight: '700', letterSpacing: 0.5 }}>
              HANDWRITTEN CODE: {dayCode}
            </Text>
          </View>
        ) : null}
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text variant="caption" color="white" style={{ fontWeight: '700', letterSpacing: 0.6 }}>LIVE CAPTURE</Text>
        </View>
      </View>

      {capture ? (
        <View style={styles.center}>
          <Text variant="caption" color="muted">Captured just now</Text>
          <Button label="Retake" variant="link" fullWidth={false} leadingIcon="retry" onPress={() => onChange(null)} />
        </View>
      ) : permission?.granted ? (
        <View style={styles.controls}>
          <Pressable accessibilityLabel="Flip camera" onPress={() => setFacing((v) => (v === 'back' ? 'front' : 'back'))} style={styles.round}>
            <Icon name="flip" size={22} />
          </Pressable>
          <Pressable accessibilityLabel="Take photo" onPress={shoot} style={styles.shutter}>
            <View style={styles.shutterCore} />
          </Pressable>
          <Pressable accessibilityLabel="Toggle flash" onPress={() => setTorch((v) => !v)} style={[styles.round, torch && { backgroundColor: colors.amberSoft }]}>
            <Icon name="flash" size={22} color={torch ? colors.amberInk : colors.forest} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const BRACKET = { position: 'absolute', width: 26, height: 26, borderColor: colors.white, borderWidth: 0 } as const;
const cornerStyle = {
  tl: { ...BRACKET, top: 14, left: 14, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { ...BRACKET, top: 14, right: 14, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { ...BRACKET, bottom: 14, left: 14, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { ...BRACKET, bottom: 14, right: 14, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
} as const;

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  frame: { aspectRatio: 1.3, overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.dark.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  hint: { textAlign: 'center', paddingHorizontal: 24 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  corner: {},
  codeOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(13,44,36,0.88)',
    borderWidth: 1,
    borderColor: colors.mint,
  },
  live: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(10,28,24,0.7)',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.status.verified },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  round: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.subtle },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.forest,
    backgroundColor: colors.surface,
  },
  shutterCore: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.forest },
});
