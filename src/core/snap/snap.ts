import { App, Ellipse, Point, PointerEvent, UIEvent } from 'leafer-editor';
import { round } from 'lodash-es';
import { LineAuxiliaryLine } from '../auxiliary';
import { DEFAULT_BOTTOM_LINE_WIDTH } from '../constants';
import { convertSize } from '../helper';

const threshold = convertSize(10);

/**
 * 获取吸附点
 * @param {Point} mousePos - 鼠标位置
 * @param {Point[]} points - 吸附点集合
 * @returns {{snapPoint: Point | null, targets: Point[], type: string}} 吸附结果
 */
export function snapToPoints(mousePos: Point, points: Point[]) {
  // 存储不同类型的吸附点
  const horizontalTargets: Point[] = []; // 水平吸附点
  const verticalTargets: Point[] = []; // 垂直吸附点
  const overlapTargets: Point[] = []; // 重合吸附点
  const intersectionTargets: Point[] = []; // 相交吸附点

  // 第一次遍历：找出所有可能的吸附点
  for (const point of points) {
    const dx = Math.abs(point.x - mousePos.x);
    const dy = Math.abs(point.y - mousePos.y);

    if (dx <= threshold && dy <= threshold) {
      // 重合吸附
      overlapTargets.push(point);
    } else {
      // 水平吸附
      if (dy <= threshold) {
        horizontalTargets.push(point);
      }
      // 垂直吸附
      if (dx <= threshold) {
        verticalTargets.push(point);
      }
    }
  }

  // 第二次遍历：寻找交点
  const intersectionPoints: Point[] = [];
  for (const hPoint of horizontalTargets) {
    for (const vPoint of verticalTargets) {
      // 创建交点
      const intersectionPoint = new Point(vPoint.x, hPoint.y);
      // 检查交点是否在鼠标附近
      const dx = Math.abs(intersectionPoint.x - mousePos.x);
      const dy = Math.abs(intersectionPoint.y - mousePos.y);
      if (dx <= threshold && dy <= threshold) {
        intersectionPoints.push(intersectionPoint);
        intersectionTargets.push(hPoint, vPoint);
      }
    }
  }

  // 按优先级返回吸附结果
  if (overlapTargets.length > 0) {
    // 优先级1：重合
    return {
      snapPoint: overlapTargets[0],
      targets: overlapTargets,
      type: 'overlap',
    };
  }

  if (intersectionPoints.length > 0) {
    // 优先级2：交点
    return {
      snapPoint: intersectionPoints[0],
      targets: intersectionTargets,
      type: 'intersection',
    };
  }

  if (horizontalTargets.length > 0) {
    // 优先级3：水平
    return {
      snapPoint: new Point(mousePos.x, horizontalTargets[0].y),
      targets: horizontalTargets,
      type: 'horizontal',
    };
  }

  if (verticalTargets.length > 0) {
    // 优先级4：垂直
    return {
      snapPoint: new Point(verticalTargets[0].x, mousePos.y),
      targets: verticalTargets,
      type: 'vertical',
    };
  }

  // 没有吸附
  return {
    snapPoint: null,
    targets: [],
    type: 'none',
  };
}

/**
 * 吸附类
 */
class Snap {
  private app: App;
  private cursor: Ellipse;
  private lineAuxiliaryLine: LineAuxiliaryLine[] = [];
  private targetPoints: Point[] = [];

  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {App} options.app - 应用实例
   */
  constructor(options: { app: App }) {
    this.app = options.app;

    // 创建鼠标指针
    this.cursor = new Ellipse({
      width: convertSize(DEFAULT_BOTTOM_LINE_WIDTH),
      height: convertSize(DEFAULT_BOTTOM_LINE_WIDTH),
      offsetX: (convertSize(DEFAULT_BOTTOM_LINE_WIDTH) / 2) * -1,
      offsetY: (convertSize(DEFAULT_BOTTOM_LINE_WIDTH) / 2) * -1,
      strokeWidth: convertSize(1),
      stroke: 'rgb(20, 127, 250)',
      fill: 'rgb(255, 255, 255)',
      visible: false,
      zIndex: 99,
    });

    // 将鼠标指针添加到 sky 层
    this.app.tree.add(this.cursor);

    // 监听鼠标移动事件
    this.app.on(PointerEvent.MOVE, (event: UIEvent) => {
      const x = round(event.getPagePoint().x);
      const y = round(event.getPagePoint().y);

      const { snapPoint, targets } = snapToPoints(new Point(x, y), this.targetPoints);

      // 清空辅助线
      this.lineAuxiliaryLine.forEach((line) => line.remove());
      this.lineAuxiliaryLine = [];

      if (snapPoint) {
        this.cursor?.set({
          x: snapPoint.x,
          y: snapPoint.y,
          visible: true,
        });

        targets.forEach((target) => {
          const lineAuxiliaryLine = new LineAuxiliaryLine({ app: this.app });
          lineAuxiliaryLine.show([target, snapPoint]);
          this.lineAuxiliaryLine.push(lineAuxiliaryLine);
        });
      } else {
        this.cursor?.set({
          x,
          y,
          visible: false,
        });
      }
    });
  }

  /**
   * 获取鼠标指针位置
   * @returns {Point} 鼠标指针位置
   */
  getCursorPoint(): Point {
    return new Point(this.cursor.x, this.cursor.y);
  }

  /**
   * 添加吸附点
   * @param {Point} point - 吸附点
   */
  addTargetPoint(point: Point): void {
    this.targetPoints.push(point);
  }

  /**
   * 清空吸附点
   */
  clearTargetPoints(): void {
    this.targetPoints = [];
  }
}

export { Snap };
