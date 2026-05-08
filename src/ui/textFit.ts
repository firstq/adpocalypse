import Phaser from 'phaser';

interface FitTextOptions {
  maxWidth: number;
  minFontSize?: number;
  ellipsis?: boolean;
}

/**
 * Reduces font size until the text fits maxWidth.
 * If still overflowing at minFontSize and ellipsis is true, truncates with "…".
 */
export function fitTextToWidth(
  text: Phaser.GameObjects.Text,
  options: FitTextOptions,
): void {
  const { maxWidth, minFontSize = 10, ellipsis = false } = options;

  let currentSize = parseInt(String(text.style.fontSize), 10);
  if (isNaN(currentSize)) currentSize = 16;

  const originalText = text.text;

  while (text.width > maxWidth && currentSize > minFontSize) {
    currentSize -= 1;
    text.setFontSize(currentSize);
  }

  if (ellipsis && text.width > maxWidth) {
    let truncated = originalText;
    while (text.width > maxWidth && truncated.length > 1) {
      truncated = truncated.slice(0, -1);
      text.setText(truncated.trimEnd() + '…');
    }
  }
}
