import '@leafer-in/view';
import { message } from 'ant-design-vue';
import { Point, PointerEvent, RenderEvent } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from '../basic/basic-draw';
import { DEFAULT_ZOOM_SCALE } from '../constants';
import { BottomLine } from './bottom-line';
import { BottomLineGroup } from './bottom-line-group';

/**
 * @typedef {Object} DrawBottomOptions
 * @extends BasicDrawOptions
 * @property {Function} [onHistoryChange] - 历史记录变化回调
 * @property {Function} [onOrthogonalChange] - 正交变化回调
 * @property {Function} [onShowAngleChange] - 显示角度变化回调
 */
interface DrawBottomOptions extends BasicDrawOptions {
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onOrthogonalChange?: (orthogonal: boolean) => void;
  onShowAngleChange?: (orthogonal: boolean) => void;
}

/**
 * 用于绘制腔底
 * @extends BasicDraw
 */
class DrawBottom extends BasicDraw {
  private currentBottomLine: BottomLine | undefined = undefined;
  private status: 'init' | 'idle' | 'drawing' | 'done' = 'init';
  bottomLineGroup: BottomLineGroup;
  orthogonal: boolean = false;
  showAngle: boolean = true;
  private onOrthogonalChangeCallback: DrawBottomOptions['onOrthogonalChange'];
  private onShowAngleChangeChangeCallback: DrawBottomOptions['onShowAngleChange'];

  /**
   * @param {DrawBottomOptions} options - 配置选项
   */
  constructor(options: DrawBottomOptions) {
    super(options);

    this.onOrthogonalChangeCallback = options.onOrthogonalChange;
    this.onShowAngleChangeChangeCallback = options.onShowAngleChange;

    this.bottomLineGroup = new BottomLineGroup({
      app: this.app,
      snap: this.snap,
      debug: this.debug,
      drawBottom: this,
      onClosed: () => {
        this.status = 'done';
        message.success('绘制完成');
      },
      onHistoryChange: (canUndo, canRedo) => {
        options.onHistoryChange?.(canUndo, canRedo);
      },
    });

    this.onStart = this.onStart.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onAbort = this.onAbort.bind(this);
    this.reset = this.reset.bind(this);
    this.undo = this.undo.bind(this);
    this.exportData = this.exportData.bind(this);
    this.importData = this.importData.bind(this);
    this.resetView = this.resetView.bind(this);
    this.createBottomLine = this.createBottomLine.bind(this);

    this.app.on(PointerEvent.CLICK, this.onStart);
    this.app.on(PointerEvent.MOVE, this.onMove);
    this.app.on(PointerEvent.MENU, this.onAbort);

    this.resetView();
  }

  /**
   * 开始绘制事件处理
   */
  private onStart() {
    const point = this.snap.getCursorPoint();

    if (this.bottomLineGroup.bottomLines.length === 0) {
      this.snap.clearTargetPoints();
    }

    if (this.status === 'done') {
      return;
    }

    if (this.status === 'init') {
      this.snap.addTargetPoint(point);
    }

    if (this.status === 'idle' && !this.bottomLineGroup.isDrawablePoint(point)) {
      message.error('只能从起点或者终点继续绘制');
      return;
    }

    if (this.status === 'drawing' && this.currentBottomLine?.hit) {
      message.error('线段重合');
      return;
    }

    this.status = 'drawing';
    this.createBottomLine(point);
  }

  /**
   * 创建底边线
   * @param {Point} point - 起点
   */
  private createBottomLine(point: Point) {
    // 结束上一个底边绘制
    if (this.currentBottomLine) {
      this.currentBottomLine.finish();
      return;
    }

    this.currentBottomLine = new BottomLine({
      app: this.app,
      snap: this.snap,
      debug: this.debug,
      drawBottom: this,
      start: point,
      onModify: (bottomLine, value) => {
        this.bottomLineGroup.modifyBottomLine(bottomLine, value);
      },
      onFinish: () => {
        if (this.currentBottomLine) {
          const point = this.currentBottomLine.getEndPoint();

          // 记录当前底边，等待下一次绘制
          this.bottomLineGroup.push(this.currentBottomLine);
          this.currentBottomLine = undefined;

          // 创建下一个底边
          if (this.status === 'drawing') {
            this.createBottomLine(point);
          }
        }
      },
    });
  }

  /**
   * 切换正交绘制状态
   */
  toggleOrthogonal() {
    this.orthogonal = !this.orthogonal;
    this.onOrthogonalChangeCallback?.(this.orthogonal);
  }

  /**
   * 切换显示夹角
   */
  toggleShowAngle() {
    this.showAngle = !this.showAngle;

    if (this.showAngle) {
      this.currentBottomLine?.showAngleAuxiliaryLine();
    } else {
      this.currentBottomLine?.hideAngleAuxiliaryLine();
    }

    this.onShowAngleChangeChangeCallback?.(this.showAngle);
  }

  /**
   * 鼠标移动事件处理
   */
  private onMove() {
    const point = this.snap.getCursorPoint();

    if (this.status === 'drawing') {
      this.currentBottomLine?.drawing(point);
    }
  }

  /**
   * 终止绘制事件处理
   */
  private onAbort() {
    this.status = 'idle';
    this.currentBottomLine?.abort();
    this.currentBottomLine = undefined;
  }

  /**
   * 撤销上一步操作
   */
  undo() {
    this.status = 'idle';
    this.bottomLineGroup.undo();

    if (this.bottomLineGroup.bottomLines.length === 0) {
      this.reset();
    }
  }

  /**
   * 恢复上一步撤销的操作
   */
  redo() {
    this.status = 'idle';
    this.bottomLineGroup.redo();
  }

  /**
   * 重置绘制状态
   */
  reset() {
    this.onAbort();
    this.bottomLineGroup.drawHistory.clear();

    this.status = 'init';
    this.currentBottomLine = undefined;
    this.bottomLineGroup.clear();
    this.debug.clear();
  }

  /**
   * 导出数据
   * @returns {Array<{x: number, y: number}>} 导出的数据
   */
  exportData() {
    return this.bottomLineGroup.exportData();
  }

  /**
   * 导入数据
   * @param {Array<{x: number, y: number}>} data - 要导入的数据
   */
  importData(data: { x: number; y: number }[]) {
    this.reset();
    this.resetView();

    this.bottomLineGroup.importData(data);

    this.app.tree.once(RenderEvent.END, () => {
      this.app.tree.zoom(this.bottomLineGroup.closedPolygon, undefined, true);
    });
  }

  /**
   * 重置视图
   */
  private resetView() {
    this.app.tree.zoomLayer.scale = DEFAULT_ZOOM_SCALE;
    this.app.tree.zoomLayer.x = 0;
    this.app.tree.zoomLayer.y = 0;
  }
}

export { DrawBottom };
