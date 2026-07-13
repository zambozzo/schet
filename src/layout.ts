import { PixelRatio, useWindowDimensions } from 'react-native';

/** Базовый макет — обычный телефон ~390×844 */
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  const scale = clamp(shortSide / BASE_WIDTH, 0.82, 1.28);
  const vScale = clamp(longSide / BASE_HEIGHT, 0.82, 1.2);

  const s = (size: number) =>
    Math.round(PixelRatio.roundToNearestPixel(size * scale));
  const vs = (size: number) =>
    Math.round(PixelRatio.roundToNearestPixel(size * vScale));
  /** Умеренное масштабирование текста */
  const ms = (size: number, factor = 0.45) =>
    Math.round(size + (s(size) - size) * factor);

  const isCompact = height < 720;
  const isWide = width >= 600;
  const contentMaxWidth = isWide ? Math.min(560, width - 48) : width;
  const padH = isWide ? 28 : s(20);

  return {
    width,
    height,
    s,
    vs,
    ms,
    isCompact,
    isWide,
    contentMaxWidth,
    padH,
    scale,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
