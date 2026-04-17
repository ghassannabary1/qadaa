import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import {
  PATTERN_OPACITY,
  PATTERN_PALETTE,
} from './patternTokens';

type HeaderBackdropProps = {
  size?: 'header' | 'hero';
  style?: StyleProp<ViewStyle>;
};

export function HeaderBackdrop({
  size = 'header',
  style,
}: HeaderBackdropProps) {
  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <View style={[styles.floralSpray, styles.floralSprayTopLeft]}>
        <View style={[styles.floralStem, styles.floralStemLong]} />
        <View style={[styles.floralStem, styles.floralStemShort]} />
        <View style={[styles.sazLeaf, styles.sazLeafOne]} />
        <View style={[styles.sazLeaf, styles.sazLeafTwo]} />
        <View style={[styles.tulipPetal, styles.tulipCenter]} />
        <View style={[styles.tulipPetal, styles.tulipLeft]} />
        <View style={[styles.tulipPetal, styles.tulipRight]} />
        <View style={[styles.hyacinthBloom, styles.hyacinthBloomTop]} />
      </View>
      <View style={[styles.floralSpray, styles.floralSprayBottomRight]}>
        <View style={[styles.floralStem, styles.floralStemLong]} />
        <View style={[styles.floralStem, styles.floralStemShort]} />
        <View style={[styles.sazLeaf, styles.sazLeafOne]} />
        <View style={[styles.sazLeaf, styles.sazLeafTwo]} />
        <View style={[styles.tulipPetal, styles.tulipCenter]} />
        <View style={[styles.tulipPetal, styles.tulipLeft]} />
        <View style={[styles.tulipPetal, styles.tulipRight]} />
        <View style={[styles.hyacinthBloom, styles.hyacinthBloomTop]} />
      </View>
      <View
        style={[
          styles.medallionWrap,
          size === 'hero' ? styles.medallionWrapHero : styles.medallionWrapHeader,
        ]}
      >
        <View style={styles.medallionDiamondOuter} />
        <View style={styles.medallionDiamondMiddle} />
        <View style={styles.medallionDiamondInner} />
        <View style={[styles.medallionPetal, styles.medallionPetalTop]} />
        <View style={[styles.medallionPetal, styles.medallionPetalRight]} />
        <View style={[styles.medallionPetal, styles.medallionPetalBottom]} />
        <View style={[styles.medallionPetal, styles.medallionPetalLeft]} />
        <View style={styles.medallionCrossVertical} />
        <View style={styles.medallionCrossHorizontal} />
        <View style={styles.medallionCoreRing}>
          <View style={styles.medallionCore} />
        </View>
        <View style={styles.medallionAccentTop} />
        <View style={styles.medallionAccentRight} />
        <View style={styles.medallionAccentBottom} />
        <View style={styles.medallionAccentLeft} />
        <View style={styles.medallionPointTop} />
        <View style={styles.medallionPointRight} />
        <View style={styles.medallionPointBottom} />
        <View style={styles.medallionPointLeft} />
        <View style={[styles.rosette, styles.rosetteTopLeft]} />
        <View style={[styles.rosette, styles.rosetteTopRight]} />
        <View style={[styles.rosette, styles.rosetteBottomLeft]} />
        <View style={[styles.rosette, styles.rosetteBottomRight]} />
        <View style={[styles.innerTulip, styles.innerTulipTop]} />
        <View style={[styles.innerTulip, styles.innerTulipRight]} />
        <View style={[styles.innerTulip, styles.innerTulipBottom]} />
        <View style={[styles.innerTulip, styles.innerTulipLeft]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    opacity: 0.42,
  },
  floralSpray: {
    position: 'absolute',
    width: 164,
    height: 164,
    opacity: 0.7,
  },
  floralSprayTopLeft: {
    top: 6,
    left: -18,
  },
  floralSprayBottomRight: {
    right: -18,
    bottom: -10,
    transform: [{ rotate: '180deg' }],
  },
  floralStem: {
    position: 'absolute',
    borderColor: `${PATTERN_PALETTE.lineSecondary}50`,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    backgroundColor: 'transparent',
  },
  floralStemLong: {
    width: 108,
    height: 108,
    borderWidth: 2.2,
    borderRadius: 54,
    top: 0,
    left: 0,
  },
  floralStemShort: {
    width: 70,
    height: 70,
    borderWidth: 1.6,
    borderRadius: 35,
    top: 60,
    left: 48,
  },
  sazLeaf: {
    position: 'absolute',
    width: 24,
    height: 52,
    borderRadius: 24,
    backgroundColor: `${PATTERN_PALETTE.lineMuted}78`,
    borderWidth: 1.2,
    borderColor: `${PATTERN_PALETTE.linePrimary}40`,
  },
  sazLeafOne: {
    top: 24,
    left: 78,
    transform: [{ rotate: '26deg' }],
  },
  sazLeafTwo: {
    top: 62,
    left: 96,
    transform: [{ rotate: '68deg' }],
  },
  tulipPetal: {
    position: 'absolute',
    width: 20,
    height: 34,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1.2,
    borderColor: `${PATTERN_PALETTE.linePrimary}58`,
    backgroundColor: `${PATTERN_PALETTE.accentTerracotta}72`,
  },
  tulipCenter: {
    top: 90,
    left: 22,
  },
  tulipLeft: {
    top: 98,
    left: 10,
    transform: [{ rotate: '-18deg' }],
  },
  tulipRight: {
    top: 98,
    left: 34,
    transform: [{ rotate: '18deg' }],
  },
  hyacinthBloom: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.4,
    borderColor: `${PATTERN_PALETTE.linePrimary}5c`,
    backgroundColor: `${PATTERN_PALETTE.lineSecondary}42`,
  },
  hyacinthBloomTop: {
    top: 22,
    left: 22,
  },
  medallionWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionWrapHeader: {
    width: 304,
    height: 304,
  },
  medallionWrapHero: {
    width: 272,
    height: 272,
  },
  medallionDiamondOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderWidth: 2.4,
    borderColor: `${PATTERN_PALETTE.linePrimary}66`,
    backgroundColor: `${PATTERN_PALETTE.lineMuted}12`,
    transform: [{ rotate: '45deg' }],
  },
  medallionDiamondMiddle: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderWidth: 2.2,
    borderColor: `${PATTERN_PALETTE.lineSecondary}70`,
    transform: [{ rotate: '45deg' }],
  },
  medallionDiamondInner: {
    position: 'absolute',
    width: 102,
    height: 102,
    borderWidth: 1.8,
    borderColor: `${PATTERN_PALETTE.linePrimary}82`,
    transform: [{ rotate: '45deg' }],
  },
  medallionPetal: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.linePrimary}40`,
    backgroundColor: `${PATTERN_PALETTE.heroBg}08`,
    transform: [{ rotate: '45deg' }],
  },
  medallionPetalTop: {
    top: 18,
    left: '50%',
    marginLeft: -31,
  },
  medallionPetalRight: {
    right: 18,
    top: '50%',
    marginTop: -31,
  },
  medallionPetalBottom: {
    bottom: 18,
    left: '50%',
    marginLeft: -31,
  },
  medallionPetalLeft: {
    left: 18,
    top: '50%',
    marginTop: -31,
  },
  medallionCrossVertical: {
    position: 'absolute',
    width: 16,
    height: 152,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.linePrimary}2d`,
  },
  medallionCrossHorizontal: {
    position: 'absolute',
    width: 152,
    height: 16,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.linePrimary}2d`,
  },
  medallionCoreRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: `${PATTERN_PALETTE.linePrimary}70`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PATTERN_PALETTE.surfaceBg}66`,
  },
  medallionCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: `${PATTERN_PALETTE.linePrimary}aa`,
  },
  rosette: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    borderColor: `${PATTERN_PALETTE.linePrimary}58`,
    backgroundColor: `${PATTERN_PALETTE.accentTerracotta}26`,
  },
  rosetteTopLeft: {
    top: 56,
    left: 56,
  },
  rosetteTopRight: {
    top: 56,
    right: 56,
  },
  rosetteBottomLeft: {
    bottom: 56,
    left: 56,
  },
  rosetteBottomRight: {
    bottom: 56,
    right: 56,
  },
  innerTulip: {
    position: 'absolute',
    width: 14,
    height: 22,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    borderWidth: 1,
    borderColor: `${PATTERN_PALETTE.linePrimary}42`,
    backgroundColor: `${PATTERN_PALETTE.accentTerracotta}2a`,
  },
  innerTulipTop: {
    top: 78,
    left: '50%',
    marginLeft: -7,
  },
  innerTulipRight: {
    right: 78,
    top: '50%',
    marginTop: -11,
    transform: [{ rotate: '90deg' }],
  },
  innerTulipBottom: {
    bottom: 78,
    left: '50%',
    marginLeft: -7,
    transform: [{ rotate: '180deg' }],
  },
  innerTulipLeft: {
    left: 78,
    top: '50%',
    marginTop: -11,
    transform: [{ rotate: '270deg' }],
  },
  medallionAccentTop: {
    position: 'absolute',
    top: 46,
    left: '50%',
    marginLeft: -17,
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.lineSecondary}55`,
    transform: [{ rotate: '45deg' }],
  },
  medallionAccentRight: {
    position: 'absolute',
    right: 46,
    top: '50%',
    marginTop: -17,
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.lineSecondary}55`,
    transform: [{ rotate: '45deg' }],
  },
  medallionAccentBottom: {
    position: 'absolute',
    bottom: 46,
    left: '50%',
    marginLeft: -17,
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.lineSecondary}55`,
    transform: [{ rotate: '45deg' }],
  },
  medallionAccentLeft: {
    position: 'absolute',
    left: 46,
    top: '50%',
    marginTop: -17,
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.lineSecondary}55`,
    transform: [{ rotate: '45deg' }],
  },
  medallionPointTop: {
    position: 'absolute',
    top: -2,
    left: '50%',
    marginLeft: -9,
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.linePrimary}48`,
    transform: [{ rotate: '45deg' }],
  },
  medallionPointRight: {
    position: 'absolute',
    right: -2,
    top: '50%',
    marginTop: -9,
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.linePrimary}48`,
    transform: [{ rotate: '45deg' }],
  },
  medallionPointBottom: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -9,
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.linePrimary}48`,
    transform: [{ rotate: '45deg' }],
  },
  medallionPointLeft: {
    position: 'absolute',
    left: -2,
    top: '50%',
    marginTop: -9,
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: `${PATTERN_PALETTE.linePrimary}48`,
    transform: [{ rotate: '45deg' }],
  },
});
