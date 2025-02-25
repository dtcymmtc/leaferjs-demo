import { Ellipse, Point, PointerEvent, Polygon, UI, UIEvent } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from '../basic/basic-draw';
import { DEFAULT_BOTTOM_LINE_WIDTH } from '../constants';
import { convertSize } from '../helper';
import { BottomLine } from './bottom-line';
import { EdgeAnnotations } from './edge-annotations';

interface BottomLineGroupOptions extends BasicDrawOptions {
  onClosed?: () => void;
}

const getKey = (p: Point): string => {
  return `${p.x},${p.y}`;
};

/**
 * 用于管理一组底边线
 */
class BottomLineGroup extends BasicDraw {
  /** 底边数组 */
  bottomLines: BottomLine[] = [];
  /** 可绘制点 */
  drawablePoints: UI[] = [];
  /** 连接点 */
  linkPoints: UI[] = [];
  /** 边标注 */
  edgeAnnotations: EdgeAnnotations | undefined = undefined;
  /** 是否闭合 */
  closed = false;
  /** 闭合回调函数 */
  closedCallback: (() => void) | undefined;
  /** 闭合区域 */
  closedPolygon = new Polygon({
    points: [],
    fill: 'rgba(255, 224, 178, 1)',
    visible: false,
  });
  /** 选中的底边 */
  selectedBottomLine: BottomLine | undefined;
  /** 经过的底边 */
  hoverBottomLine: BottomLine | undefined;

  constructor(options: BottomLineGroupOptions) {
    super(options);
    this.closedCallback = options.onClosed;

    this.app.on(PointerEvent.MOVE, (e: UIEvent) => {
      if (!this.closed) return;

      this.hoverBottomLine = this.findBottomLine(e.target.innerId);
      this.updateBottomLines();
    });

    this.app.on(PointerEvent.CLICK, (e: UIEvent) => {
      if (!this.closed) return;

      this.selectedBottomLine = this.findBottomLine(e.target.innerId);
      this.updateBottomLines();
    });

    this.app.tree.add(this.closedPolygon);
  }

  /** 查找底边 */
  private findBottomLine(innerId: number): BottomLine | undefined {
    return this.bottomLines.find((line) => line.getLine().innerId === innerId);
  }

  /** 更新底边视图 */
  updateBottomLines() {
    this.bottomLines.forEach((bottomLine) => {
      if (bottomLine === this.selectedBottomLine) {
        bottomLine.select();
        return;
      }
      if (bottomLine === this.hoverBottomLine) {
        bottomLine.hover();
        return;
      }

      bottomLine.normal();
    });
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

  /** 获取可以生成矩形的顶点并排序  */
  sortPolygonPoints(): Point[] {
    // 构建邻接表
    const adjacency = new Map<string, Point[]>();

    const addEdge = (a: Point, b: Point) => {
      const keyA = getKey(a);
      if (!adjacency.has(keyA)) adjacency.set(keyA, []);
      adjacency.get(keyA)!.push(b);

      const keyB = getKey(b);
      if (!adjacency.has(keyB)) adjacency.set(keyB, []);
      adjacency.get(keyB)!.push(a);
    };

    this.bottomLines.forEach((item) => {
      addEdge(item.getStartPoint(), item.getEndPoint());
    });

    // 初始化遍历
    const startPoint = this.bottomLines[0].getStartPoint();
    const path: Point[] = [startPoint];
    let currentPoint = startPoint;
    let previousPoint: Point | null = null;

    do {
      const currentKey = getKey(currentPoint);
      const neighbors = adjacency.get(currentKey) || [];

      // 找到下一个点（排除来源点）
      const next = neighbors.find((p) => !previousPoint || getKey(p) !== getKey(previousPoint));

      if (!next) {
        return [];
      }

      // 更新路径和指针
      path.push(next);
      previousPoint = currentPoint;
      currentPoint = next;
    } while (getKey(currentPoint) !== getKey(startPoint));

    // 移除最后一个重复的起点（闭合点）
    return path.slice(0, -1);
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
      const startKey = getKey(start);
      const endKey = getKey(end);

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
        width: convertSize(DEFAULT_BOTTOM_LINE_WIDTH),
        height: convertSize(DEFAULT_BOTTOM_LINE_WIDTH),
        offsetX: (convertSize(DEFAULT_BOTTOM_LINE_WIDTH) / 2) * -1,
        offsetY: (convertSize(DEFAULT_BOTTOM_LINE_WIDTH) / 2) * -1,
        zIndex: 1,
      });

      this.app.tree.add(ui);
      this.snap.addTargetPoint(new Point(x, y));

      if (count === 1) {
        ui.set({ fill: 'rgb(20,127,250)' });
        this.drawablePoints.push(ui);
      }

      if (count === 2) {
        ui.set({ fill: 'rgb(140,140,140)' });
        this.linkPoints.push(ui);
      }
    }

    // 如果所有底边线都已绘制且没有可绘制点，则标记为闭合
    this.edgeAnnotations?.clear();
    if (this.bottomLines.length > 0 && this.drawablePoints.length === 0) {
      this.close();
    } else {
      this.open();
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

  /** 图形闭合 */
  close() {
    const polygonPoints = this.sortPolygonPoints();
    this.closed = true;
    this.snap.clearTargetPoints();
    this.closedPolygon.set({
      points: polygonPoints,
      visible: true,
    });

    this.edgeAnnotations = new EdgeAnnotations({
      points: polygonPoints,
      app: this.app,
      snap: this.snap,
      debug: this.debug,
    });

    this.closedCallback?.();
  }

  /** 图形开放 */
  open() {
    this.closed = false;
    this.closedPolygon.set({ points: [], visible: false });
  }
}

export { BottomLineGroup };
