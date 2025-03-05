/**
 * 默认缩放比例
 * @type {number}
 */
export const DEFAULT_ZOOM_SCALE = 0.125;

/**
 * 默认底线宽度
 * @type {number}
 */
export const DEFAULT_BOTTOM_LINE_WIDTH = 10;

/**
 * 底线状态枚举
 * @enum {string}
 */
export enum BottomLineStatus {
  Idle = 'BottomLineIdle',
  Drawing = 'BottomLineDrawing',
  Finish = 'BottomLineFinish',
}
