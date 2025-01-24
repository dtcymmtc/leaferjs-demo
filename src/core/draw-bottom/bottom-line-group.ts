import { Ellipse, Point, UI } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from './basic-draw';
import { BottomLine } from './bottom-line';

interface BottomLineGroupOptions extends BasicDrawOptions {
  onClosed?: () => void;
}

/**
 * 用于管理一组底边线
 */
class BottomLineGroup extends BasicDraw {
  bottomLines: BottomLine[] = [];
  /** 可绘制点 */
  drawablePoints: UI[] = [];
  /** 连接点 */
  linkPoints: UI[] = [];
  /** 是否闭合 */
  closed = false;
  /** 闭合回调函数 */
  closedCallback: (() => void) | undefined;

  constructor(options: BottomLineGroupOptions) {
    super(options);
    this.closedCallback = options.onClosed;
  }

  /**
   * 判断点是否可绘制
   * @param point - 要判断的点
   * @returns 如果点是可绘制点，返回 true；否则返回 false
   */
  isDrawablePoint(point: Point): boolean {
    if (this.drawablePoints.length === 0) return true;
    return !!this.drawablePoints.find((item) => {
      return point.x === item.x && point.y === item.y;
    });
  }

  /**
   * 更新可绘制点和连接点
   */
  update(): void {
    const pointCount: Map<string, number> = new Map();

    // 统计每个点作为起点或终点的次数
    for (const line of this.bottomLines) {
      const start = line.getStartPoint();
      const end = line.getEndPoint();
      const startKey = `${start.x},${start.y}`;
      const endKey = `${end.x},${end.y}`;

      pointCount.set(startKey, (pointCount.get(startKey) || 0) + 1);
      pointCount.set(endKey, (pointCount.get(endKey) || 0) + 1);
    }

    // 清空可绘制点
    this.drawablePoints.forEach((item) => {
      item.remove();
    });
    this.drawablePoints = [];

    // 清空连接点
    this.linkPoints.forEach((item) => {
      item.remove();
    });
    this.linkPoints = [];

    // 清空吸附点
    this.snap.clearTargetPoints();

    // 更新可绘制点和连接点
    for (const [key, count] of pointCount.entries()) {
      const [x, y] = key.split(',').map(Number);

      const ui = new Ellipse({
        x,
        y,
        width: 16,
        height: 16,
        offsetX: -8,
        offsetY: -8,
        zIndex: 1,
      });

      this.app.sky.add(ui);
      this.snap.addTargetPoint(new Point(x, y));

      if (count === 1) {
        ui.set({ fill: 'blue' });
        this.drawablePoints.push(ui);
      }

      if (count === 2) {
        ui.set({ fill: 'rgb(166, 166, 166)' });
        this.linkPoints.push(ui);
      }
    }

    // 如果所有底边线都已绘制且没有可绘制点，则标记为闭合
    if (this.bottomLines.length > 0 && this.drawablePoints.length === 0) {
      this.closed = true;
      this.snap.clearTargetPoints();
      this.closedCallback?.();
    }
  }

  /**
   * 移除最后一条底边线
   */
  pop(): void {
    const bottomLine = this.bottomLines.pop();
    bottomLine?.remove();
    this.update();
  }

  /**
   * 添加一条底边线
   * @param line - 要添加的底边线
   */
  push(line: BottomLine): void {
    this.bottomLines.push(line);
    this.update();
  }

  /**
   * 清空所有底边线和点
   */
  clear(): void {
    this.bottomLines.forEach((line) => line.remove());
    this.bottomLines = [];
    this.drawablePoints.forEach((item) => item.remove());
    this.drawablePoints = [];
    this.linkPoints.forEach((item) => item.remove());
    this.linkPoints = [];

    this.update();
  }
}

export { BottomLineGroup };
