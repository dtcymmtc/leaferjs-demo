import { Ellipse, Point, UI } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from './basic-draw';
import { BottomLine } from './bottom-line';

class BottomLineGroup extends BasicDraw {
  bottomLines: BottomLine[] = [];
  /** 可绘制点 */
  drawablePoints: UI[] = [];
  /** 连接点 */
  linkPoints: UI[] = [];

  constructor(options: BasicDrawOptions) {
    super(options);
  }

  /** 判断点是否可绘制 */
  isDrawablePoint(point: Point) {
    if (this.drawablePoints.length === 0) return true;
    return this.drawablePoints.find((item) => {
      return point.x === item.x && point.y === item.y;
    });
  }

  /** 更新点 */
  update() {
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

    for (const [key, count] of pointCount.entries()) {
      const [x, y] = key.split(',').map(Number);

      const ui = new Ellipse({
        x,
        y,
        width: 16,
        height: 16,
        offsetX: -8,
        offsetY: -8,
      });
      this.app.tree.add(ui);

      if (count === 1) {
        ui.set({ fill: 'blue' });
        this.drawablePoints.push(ui);
      }

      if (count === 2) {
        ui.set({ fill: 'rgb(166, 166, 166)' });
        this.linkPoints.push(ui);
      }
    }
  }

  pop() {
    const bottomLine = this.bottomLines.pop();
    bottomLine?.remove();
    this.update();
  }

  push(line: BottomLine) {
    this.bottomLines.push(line);
    this.update();
  }

  clear() {
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
