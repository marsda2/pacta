import { useEffect, useId, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/ui/Text';

// Pax, el companion de PACTA. Geometría portada de pax.svg (viewBox 240x280);
// las animaciones CSS del SVG se reimplementan con Reanimated para web y móvil.
export type PaxExpression = 'idle' | 'happy' | 'talking' | 'worried' | 'sleeping';

const INK = '#29342F';
const MINT = '#AFEBCE';
const DARK = '#194D40';
const FACE = '#393A3F';
const TONGUE = '#D6A0A0';

const BODY =
  'M108 18 C75 16 51 32 42 59 C32 86 32 116 33 147 C33 176 34 196 44 212 C55 229 74 234 100 234 C129 235 150 227 160 208 C170 191 172 165 173 139 L173 108 C173 74 168 48 152 32 C141 22 126 18 108 18 Z M102 101 C87 100 79 107 77 121 C75 136 75 153 76 169 C77 184 85 190 100 190 C115 190 122 182 123 168 L126 125 C127 109 118 101 102 101 Z';
const OUTER_EDGE =
  'M173 108 C173 74 168 48 152 32 C141 22 126 18 108 18 C75 16 51 32 42 59 C32 86 32 116 33 147 C33 176 34 196 44 212 C55 229 74 234 100 234 C129 235 150 227 160 208 C170 191 172 165 173 139';
const INNER_EDGE =
  'M102 101 C87 100 79 107 77 121 C75 136 75 153 76 169 C77 184 85 190 100 190 C115 190 122 182 123 168 L126 125 C127 109 118 101 102 101 Z';
const ARM_RIGHT =
  'M164 111 C174 109 180 103 181 94 C181 87 187 79 192 87 C197 80 205 82 208 88 C215 99 208 111 199 121 C190 130 181 135 168 138';

const VIEW_W = 240;
const VIEW_H = 280;

interface PaxProps {
  expression?: PaxExpression;
  waving?: boolean;
  animate?: boolean;
  size?: number;
}

function usePrefersMotion(animate: boolean) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
  }, []);
  return animate && !reduced;
}

export function Pax({ expression = 'idle', waving = false, animate = true, size = 160 }: PaxProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clipId = `pax-clip-${uid}`;
  const s = size / VIEW_W;
  const height = VIEW_H * s;
  const motion = usePrefersMotion(animate);

  const body = useSharedValue(0);
  const wave = useSharedValue(0);
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(true);

  useEffect(() => {
    cancelAnimation(body);
    body.value = 0;
    if (!motion) return;
    const duration = expression === 'happy' ? 650 : expression === 'sleeping' ? 2000 : 1800;
    body.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(body);
  }, [expression, motion, body]);

  useEffect(() => {
    cancelAnimation(wave);
    wave.value = 0;
    if (!motion || !waving) return;
    wave.value = withRepeat(
      withSequence(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })),
      -1,
    );
    return () => cancelAnimation(wave);
  }, [motion, waving, wave]);

  useEffect(() => {
    if (!motion || expression === 'happy' || expression === 'sleeping') return;
    let off: ReturnType<typeof setTimeout>;
    const timer = setInterval(() => {
      setBlink(true);
      off = setTimeout(() => setBlink(false), 130);
    }, 5200);
    return () => {
      clearInterval(timer);
      clearTimeout(off);
    };
  }, [motion, expression]);

  useEffect(() => {
    if (!motion || expression !== 'talking') return;
    const timer = setInterval(() => setMouthOpen((open) => !open), 170);
    return () => clearInterval(timer);
  }, [motion, expression]);

  const bodyStyle = useAnimatedStyle(() => {
    if (expression === 'happy') {
      return { transform: [{ translateY: -4 * s * body.value }, { rotate: `${-2 * body.value}deg` }] };
    }
    if (expression === 'sleeping') {
      return { transform: [{ translateX: s }, { translateY: (9 - 2 * body.value) * s }, { rotate: '-8deg' }] };
    }
    return { transform: [{ translateY: -1.6 * s * body.value }] };
  });

  const armStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-18 * wave.value}deg` }] }));

  const eyesClosedLine = expression === 'sleeping';
  const eyesHappy = expression === 'happy';
  const browTilt = expression === 'worried' ? 22 : 0;

  return (
    <Animated.View
      accessible
      accessibilityLabel="Pax, PACTA's companion"
      style={[{ width: size, height, transformOrigin: '45% 85%' }, bodyStyle]}
    >
      <Svg width={size} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Defs>
          <ClipPath id={clipId}>
            <Path clipRule="evenodd" d={BODY} />
          </ClipPath>
        </Defs>

        <Path d="M40 104 C28 115 20 134 22 148 C23 158 29 167 38 168 L48 128 Z" fill={MINT} stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M64 221 C62 230 55 238 56 243 C59 249 75 249 83 246 C87 242 87 232 88 227 Z" fill={MINT} stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M121 227 C122 237 123 244 131 246 C141 249 153 248 155 244 C157 240 149 234 143 225 Z" fill={MINT} stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />

        <Path d={BODY} fill={MINT} fillRule="evenodd" />
        <G clipPath={`url(#${clipId})`}>
          <Path d="M25 165 C44 153 70 159 84 170 C100 182 110 201 104 217 C101 227 99 233 92 238 L28 240 Z" fill={DARK} />
        </G>
        <Path d={OUTER_EDGE} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={INNER_EDGE} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />

        <G fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round">
          <Path d="M75 49 Q79 43 85 44" transform={`rotate(${-browTilt} 80 46.5)`} />
          <Path d="M125 44 Q131 43 135 49" transform={`rotate(${browTilt} 130 46.5)`} />
        </G>

        {eyesHappy ? (
          <G fill="none" stroke={INK} strokeWidth={3.8} strokeLinecap="round">
            <Path d="M72 70 Q81 49 91 69" />
            <Path d="M117 69 Q127 48 137 69" />
          </G>
        ) : eyesClosedLine ? (
          <G fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round">
            <Path d="M74 68 Q82 77 90 68" />
            <Path d="M119 68 Q127 77 135 68" />
          </G>
        ) : (
          <G fill={FACE}>
            <Ellipse cx={82} cy={68} rx={5.8} ry={blink ? 0.7 : 10.2} />
            <Ellipse cx={127} cy={68} rx={5.8} ry={blink ? 0.7 : 10.2} />
          </G>
        )}

        <G transform="translate(104 82)">
          {expression === 'talking' ? (
            <G>
              <Ellipse cx={0} cy={0} rx={8} ry={mouthOpen ? 9 : 4} fill={FACE} stroke={INK} strokeWidth={1.4} />
              {mouthOpen ? <Ellipse cx={0} cy={4} rx={5.4} ry={3} fill={TONGUE} /> : null}
            </G>
          ) : expression === 'worried' ? (
            <Path d="M-8 4 Q0 -5 8 4" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <G>
              <Path d="M-9 -3 C-4 -4 0 -2 5 -5 C10 -8 13 -3 10 1 C7 7 -5 7 -9 2 C-11 0 -11 -1 -9 -3 Z" fill={FACE} stroke={INK} strokeWidth={1.4} />
              <Path d="M-6 2 Q0 -2 7 2 Q1 7 -6 2" fill={TONGUE} />
            </G>
          )}
        </G>

        {expression === 'sleeping' ? (
          <G fill={FACE}>
            <SvgText x={186} y={64} fontSize={15} fontWeight="600">z</SvgText>
            <SvgText x={199} y={48} fontSize={19} fontWeight="600">z</SvgText>
            <SvgText x={214} y={30} fontSize={23} fontWeight="600">Z</SvgText>
          </G>
        ) : null}
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transformOrigin: [168 * s, 129 * s, 0] }, armStyle]}
      >
        <Svg width={size} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
          <Path d={ARM_RIGHT} fill={MINT} stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

interface PaxSaysProps {
  message: string;
  expression?: PaxExpression;
  size?: number;
}

// Pax con globo de texto, para el copilot y los estados vacíos.
export function PaxSays({ message, expression = 'talking', size = 96 }: PaxSaysProps) {
  return (
    <View style={styles.says}>
      <Pax expression={expression} size={size} />
      <View style={styles.bubble}>
        <View style={styles.tail} />
        <Text variant="bodyStrong" style={styles.bubbleText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  says: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubble: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE8E3',
  },
  tail: {
    position: 'absolute',
    left: -6,
    top: 22,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DDE8E3',
    transform: [{ rotate: '45deg' }],
  },
  bubbleText: { fontWeight: '600' },
});
