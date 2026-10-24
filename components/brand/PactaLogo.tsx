import { Image, StyleSheet, View } from 'react-native';

import logoHorizontal from '@/assets/brand/logo_horizontal.png';
import logoSymbol from '@/assets/brand/logo_symbol.png';
import { Text } from '@/components/ui/Text';

// Símbolo oficial de PACTA (assets/brand).
export function PactaMark({ size = 40 }: { size?: number }) {
  return <Image source={logoSymbol} style={{ width: size, height: size }} resizeMode="contain" accessibilityLabel="PACTA" />;
}

interface PactaLogoProps {
  size?: number;
  tagline?: string;
}

// Logo horizontal oficial (1600x390). `size` es la altura del logo.
export function PactaLogo({ size = 40, tagline }: PactaLogoProps) {
  return (
    <View style={styles.wrap}>
      <Image source={logoHorizontal} style={{ width: size * (1600 / 390), height: size }} resizeMode="contain" accessibilityLabel="PACTA" />
      {tagline ? <Text variant="eyebrow" color="muted">{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start', gap: 6 },
});
