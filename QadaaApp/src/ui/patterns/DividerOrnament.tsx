import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import {
  PATTERN_OPACITY,
  PATTERN_PALETTE,
} from './patternTokens';

type DividerOrnamentProps = {
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function DividerOrnament({
  color = PATTERN_PALETTE.linePrimary,
  style,
}: DividerOrnamentProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.line, { backgroundColor: color }]} />
      <View style={styles.core}>
        <Text style={[styles.symbol, { color }]}>✦</Text>
      </View>
      <View style={[styles.line, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
    opacity: PATTERN_OPACITY.dividerAccent,
  },
  line: {
    flex: 1,
    height: 1,
  },
  core: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PATTERN_PALETTE.surfaceBg}66`,
    borderWidth: 1,
    borderColor: `${PATTERN_PALETTE.lineSecondary}24`,
  },
  symbol: {
    fontSize: 13,
    fontWeight: '700',
  },
});
