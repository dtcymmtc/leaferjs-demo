import { Ellipse, Point, PointerEvent, Polygon, UI, UIEvent } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from '../basic/basic-draw';
import { DEFAULT_BOTTOM_LINE_WIDTH } from '../constants';
import { adjustLineFromCenter, calculateAreaSign, convertSize, getLinePoints } from '../helper';
import { BottomLine } from './bottom-line';
import { DrawBottom } from './draw-bottom';
import { DrawHistory } from './draw-history';

/**
 * @typedef {Object} BottomLineGroupOptions
 * @extends BasicDrawOptions
 * @property {Function} [onClosed] - 闭合回调
 * @property {Function} [onHistoryChange] - 历史记录变化回调
 * @property {DrawBottom} drawBottom - 绘制腔底实例
 */
interface BottomLineGroupOptions extends BasicDrawOptions {
  onClosed?: () => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  drawBottom: DrawBottom;
}

const getKey = (p: Point): string => {
  return `${p.x},${p.y}`;
};

/**
 * 用于管理一组底边线
 * @extends BasicDraw
 */
class BottomLineGroup extends BasicDraw {
  private drawBottom: DrawBottom;

  /** 底边数组 */
  bottomLines: BottomLine[] = [];
  /** 可绘制点 */
  drawablePoints: UI[] = [];
  /** 连接点 */
  private linkPoints: UI[] = [];
  /** 是否闭合 */
  closed = false;
  /** 闭合回调函数 */
  private closedCallback: (() => void) | undefined;
  /** 闭合区域 */
  closedPolygon = new Polygon({
    points: [],
    fill: 'rgba(255, 224, 178, 1)',
    visible: false,
  });
  /** 选中的底边 */
  private selectedBottomLine: BottomLine | undefined;
  /** 经过的底边 */
  private hoverBottomLine: BottomLine | undefined;
  /** 历史记录  */
  drawHistory: DrawHistory;

  /**
   * @param {BottomLineGroupOptions} options - 配置选项
   */
  constructor(options: BottomLineGroupOptions) {
    super(options);
    this.closedCallback = options.onClosed;
    this.drawBottom = options.drawBottom;
    this.getPoints = this.getPoints.bind(this);
    this.modifyBottomLine = this.modifyBottomLine.bind(this);
    this.saveHistory = this.saveHistory.bind(this);
    this.drawHistory = new DrawHistory({
      onHistoryChange: options.onHistoryChange,
    });

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
  private updateBottomLines() {
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
   * @param {Point} point - 要判断的点
   * @returns {boolean} 如果点是可绘制点，返回 true；否则返回 false
   */
  isDrawablePoint(point: Point): boolean {
    if (this.drawablePoints.length === 0) return true;
    return !!this.drawablePoints.find((item) => {
      return point.x === item.x && point.y === item.y;
    });
  }

  /** 保存当前状态到历史记录栈 */
  saveHistory() {
    this.drawHistory.saveHistory(this.getPoints());
  }

  /** 获取可以生成矩形的顶点并排序  */
  private sortPolygonPoints(): Point[] {
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
   * 修改底边重新闭合
   * @param {BottomLine} bottomLine - 底边
   * @param {number} value - 底边长度
   */
  modifyBottomLine(bottomLine: BottomLine, value: number) {
    this.saveHistory();

    const oldValue = bottomLine.getPoints();
    const newValue = adjustLineFromCenter(bottomLine.getLine(), Number(value));
    bottomLine.setStartEndPoint(newValue[0], newValue[1]);

    const [newStart, newEnd] = newValue;
    const [oldStart, oldEnd] = oldValue;

    this.bottomLines.forEach((bottomLine) => {
      const [start, end] = getLinePoints(bottomLine.getLine());

      if (start.x === oldStart.x && start.y === oldStart.y) {
        bottomLine.setStartEndPoint(newStart, end);
        return;
      }

      if (start.x === oldEnd.x && start.y === oldEnd.y) {
        bottomLine.setStartEndPoint(newEnd, end);
        return;
      }

      if (end.x === oldStart.x && end.y === oldStart.y) {
        bottomLine.setStartEndPoint(start, newStart);
        return;
      }

      if (end.x === oldEnd.x && end.y === oldEnd.y) {
        bottomLine.setStartEndPoint(start, newEnd);
        return;
      }
    });

    this.hoverBottomLine = undefined;
    this.selectedBottomLine = undefined;

    this.update();
  }

  /**
   * 更新可绘制点和连接点
   */
  private update(): void {
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

    if (this.bottomLines.length > 0 && this.drawablePoints.length === 0) {
      this.close();
    } else {
      this.open();
    }
  }

  /** 获取点数据 */
  getPoints() {
    return this.bottomLines.map((item) => item.getPoints());
  }

  /* 读取点数据  */
  loadPoints(points: Point[][]) {
    this.bottomLines.forEach((line) => line.remove());
    this.bottomLines = [];

    points.forEach(([start, end]) => {
      const newBottomLine = new BottomLine({
        app: this.app,
        snap: this.snap,
        debug: this.debug,
        start: start,
        drawBottom: this.drawBottom,
        onModify: (bottomLine, value) => {
          this.modifyBottomLine(bottomLine, value);
        },
      });

      newBottomLine.setStartEndPoint(start, end);
      newBottomLine.finish();

      this.bottomLines.push(newBottomLine);
    });

    this.update();
  }

  /**
   * 撤销上一步操作
   */
  undo() {
    const previousState = this.drawHistory.undo(this.getPoints());
    if (previousState) {
      this.loadPoints(previousState);
    }
    return previousState;
  }

  /**
   * 恢复上一步撤销的操作
   */
  redo() {
    const nextState = this.drawHistory.redo(this.getPoints());
    if (nextState) {
      this.loadPoints(nextState);
    }
    return nextState;
  }

  /**
   * 导出数据
   * @returns {Array<{x: number, y: number}>} 导出的数据
   */
  exportData() {
    const result = this.sortPolygonPoints().map((point) => {
      return {
        x: point.x,
        y: point.y,
      };
    });
    console.log('【数据导出】', result);
    return result;
  }

  /**
   * 导入数据
   * @param {Array<{x: number, y: number}>} data - 要导入的数据
   */
  importData(data: { x: number; y: number }[]) {
    this.drawHistory.clear();
    this.saveHistory();

    const points = data.map((statPoint, index) => {
      const endPoint = new Point(data[index + 1 === data.length ? 0 : index + 1]);
      return [new Point(statPoint), endPoint];
    });

    this.loadPoints(points);
  }

  /**
   * 移除最后一条底边线
   */
  pop(): void {
    this.saveHistory();

    const bottomLine = this.bottomLines.pop();
    bottomLine?.remove();
    this.update();
  }

  /**
   * 添加一条底边线
   * @param {BottomLine} line - 要添加的底边线
   */
  push(line: BottomLine): void {
    this.saveHistory();

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
  private close() {
    const polygonPoints = this.sortPolygonPoints();
    const area = calculateAreaSign(polygonPoints);
    const isCCW = area > 0; // 逆时针标志

    this.closed = true;
    this.snap.clearTargetPoints();

    this.closedPolygon.set({
      points: polygonPoints,
      visible: true,
    });

    this.bottomLines.forEach((bottomLine, index) => {
      bottomLine.showAnnotation({
        showLabel: true,
        // 保证绘制方向正确
        points: [
          polygonPoints[index],
          polygonPoints[index + 1 === polygonPoints.length ? 0 : index + 1],
        ],
        isCCW,
      });
    });

    this.closedCallback?.();
  }

  /** 图形开放 */
  private open() {
    this.closed = false;
    this.closedPolygon.set({ points: [], visible: false });

    this.bottomLines.forEach((bottomLine) => {
      bottomLine.hideAnnotation();
    });
  }
}

export { BottomLineGroup };
