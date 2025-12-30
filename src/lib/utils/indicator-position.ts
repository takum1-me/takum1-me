/**
 * ホバーインジケーターの位置計算ユーティリティ
 */

// ホバーの表示範囲設定
export const HOVER_DISPLAY_MARGIN = 100; // ホバーが表示される範囲（px）

interface ButtonRefs {
  get: (id: string) => HTMLElement | undefined;
}

interface NavRect {
  width: number;
  height: number;
  left: number;
  top: number;
}

/**
 * 垂直方向のインジケーター位置を計算
 */
export function calculateVerticalIndicatorPosition(
  mouseY: number,
  navRect: NavRect,
  buttonRefs: ButtonRefs,
  items: Array<{ id: string }>,
): { top: number; left: number; width: number; height: number } {
  const width = navRect.width - 16;
  const height = 40;
  const left = 8;

  const firstButton = buttonRefs.get(items[0]?.id);
  const lastButton = buttonRefs.get(items[items.length - 1]?.id);

  let top = mouseY - height / 2;

  if (firstButton && lastButton) {
    const firstButtonRect = firstButton.getBoundingClientRect();
    const lastButtonRect = lastButton.getBoundingClientRect();

    const firstButtonCenter =
      firstButtonRect.top - navRect.top + firstButtonRect.height / 2;
    const lastButtonCenter =
      lastButtonRect.top - navRect.top + lastButtonRect.height / 2;

    if (mouseY < firstButtonCenter) {
      top = Math.max(0, firstButtonCenter - height / 2);
    } else if (mouseY > lastButtonCenter) {
      top = Math.min(navRect.height - height, lastButtonCenter - height / 2);
    }
  }

  top = Math.max(0, Math.min(top, navRect.height - height));

  return { top, left, width, height };
}

/**
 * 水平方向のインジケーター位置を計算
 */
export function calculateHorizontalIndicatorPosition(
  mouseX: number,
  navRect: NavRect,
  buttonRefs: ButtonRefs,
  items: Array<{ id: string }>,
): { top: number; left: number; width: number; height: number } {
  const width = 120;
  const height = 45;
  const top = 8;

  const firstButton = buttonRefs.get(items[0]?.id);
  const lastButton = buttonRefs.get(items[items.length - 1]?.id);

  let left = mouseX - width / 2;

  if (firstButton && lastButton) {
    const firstButtonRect = firstButton.getBoundingClientRect();
    const lastButtonRect = lastButton.getBoundingClientRect();

    const firstButtonCenter =
      firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
    const lastButtonCenter =
      lastButtonRect.left - navRect.left + lastButtonRect.width / 2;

    if (mouseX < firstButtonCenter - HOVER_DISPLAY_MARGIN) {
      left = Math.max(-HOVER_DISPLAY_MARGIN, firstButtonCenter - width / 2);
    } else if (mouseX > lastButtonCenter + HOVER_DISPLAY_MARGIN) {
      left = Math.min(
        navRect.width - width + HOVER_DISPLAY_MARGIN,
        lastButtonCenter - width / 2,
      );
    }

    left = Math.max(
      firstButtonCenter - width / 2,
      Math.min(left, lastButtonCenter - width / 2),
    );
  } else {
    left = Math.max(
      -HOVER_DISPLAY_MARGIN,
      Math.min(left, navRect.width - width + HOVER_DISPLAY_MARGIN),
    );
  }

  return { top, left, width, height };
}

/**
 * エントリー時の垂直方向インジケーター位置を計算
 */
export function calculateVerticalEntryPosition(
  mouseY: number,
  navRect: NavRect,
  buttonRefs: ButtonRefs,
  items: Array<{ id: string }>,
): { top: number; left: number; width: number; height: number } {
  const width = navRect.width - 16;
  const height = 40;
  const left = 8;

  const firstButton = buttonRefs.get(items[0]?.id);
  const lastButton = buttonRefs.get(items[items.length - 1]?.id);

  let top = mouseY - height / 2;

  if (firstButton && lastButton) {
    const firstButtonRect = firstButton.getBoundingClientRect();
    const lastButtonRect = lastButton.getBoundingClientRect();

    const firstButtonCenter =
      firstButtonRect.top - navRect.top + firstButtonRect.height / 2;
    const lastButtonCenter =
      lastButtonRect.top - navRect.top + lastButtonRect.height / 2;

    if (mouseY < firstButtonCenter) {
      top = Math.max(0, firstButtonCenter - height / 2);
    } else if (mouseY > lastButtonCenter) {
      top = Math.min(navRect.height - height, lastButtonCenter - height / 2);
    }
  }

  top = Math.max(0, Math.min(top, navRect.height - height));

  return { top, left, width, height };
}

/**
 * エントリー時の水平方向インジケーター位置を計算
 */
export function calculateHorizontalEntryPosition(
  mouseX: number,
  navRect: NavRect,
  buttonRefs: ButtonRefs,
  items: Array<{ id: string }>,
): { top: number; left: number; width: number; height: number } {
  const width = 120;
  const height = 45;
  const top = 8;

  const firstButton = buttonRefs.get(items[0]?.id);
  const lastButton = buttonRefs.get(items[items.length - 1]?.id);

  let left = mouseX - width / 2;

  if (firstButton && lastButton) {
    const firstButtonRect = firstButton.getBoundingClientRect();
    const lastButtonRect = lastButton.getBoundingClientRect();

    const firstButtonCenter =
      firstButtonRect.left - navRect.left + firstButtonRect.width / 2;
    const lastButtonCenter =
      lastButtonRect.left - navRect.left + lastButtonRect.width / 2;

    if (mouseX < firstButtonCenter - HOVER_DISPLAY_MARGIN) {
      left = Math.max(-HOVER_DISPLAY_MARGIN, firstButtonCenter - width / 2);
    } else if (mouseX > lastButtonCenter + HOVER_DISPLAY_MARGIN) {
      left = Math.min(
        navRect.width - width + HOVER_DISPLAY_MARGIN,
        lastButtonCenter - width / 2,
      );
    }

    left = Math.max(
      firstButtonCenter - width / 2,
      Math.min(left, lastButtonCenter - width / 2),
    );
  } else {
    left = Math.max(
      -HOVER_DISPLAY_MARGIN,
      Math.min(left, navRect.width - width + HOVER_DISPLAY_MARGIN),
    );
  }

  return { top, left, width, height };
}
