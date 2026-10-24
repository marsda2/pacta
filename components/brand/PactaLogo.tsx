import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { colors } from '@/lib/theme';

// Marca provisional: dos eslabones enlazados. Sustituir por el SVG oficial del logo.
export function PactaMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="PACTA">
      <Defs>
        <SvgGradient id="pacta-mark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#35C79A" />
          <Stop offset="1" stopColor="#0E6B55" />
        </SvgGradient>
      </Defs>
      <Rect x={8} y={26} width={30} height={30} rx={15} fill="none" stroke="url(#pacta-mark)" strokeWidth={9} />
      <Rect x={26} y={8} width={30} height={30} rx={15} fill="none" stroke={colors.forest} strokeWidth={9} />
    </Svg>
  );
}

interface PactaLogoProps {
  size?: number;
  tagline?: string;
}

export function PactaLogo({ size = 40, tagline }: PactaLogoProps) {
  return (
    <View style={styles.row}>
      <PactaMark size={size} />
      <View>
        <Text style={{ fontSize: size * 0.8, lineHeight: size * 0.9, fontWeight: '900', letterSpacing: -1.5 }}>PACTA</Text>
        {tagline ? <Text variant="eyebrow" color="muted">{tagline}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
