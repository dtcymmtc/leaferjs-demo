import { message } from 'ant-design-vue';
import { Point, PointerEvent } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from './basic-draw';
import { BottomLine } from './bottom-line';
import { BottomLineGroup } from './bottom-line-group';

/**
 * 用于绘制腔底
 */
class DrawBottom extends BasicDraw {
  currentBottomLine: BottomLine | undefined = undefined;
  status: 'init' | 'idle' | 'drawing' | 'done' = 'init';
  bottomLineGroup: BottomLineGroup;

  constructor(options: BasicDrawOptions) {
    super(options);

    this.bottomLineGroup = new BottomLineGroup({
      app: this.app,
      snap: this.snap,
      debug: this.debug,
      onClosed: () => {
        this.status = 'done';
        message.success('绘制完成');
      },
    });

    this.onStart = this.onStart.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onAbort = this.onAbort.bind(this);
    this.reset = this.reset.bind(this);
    this.undo = this.undo.bind(this);

    this.app.on(PointerEvent.CLICK, this.onStart);
    this.app.on(PointerEvent.MOVE, this.onMove);
    this.app.on(PointerEvent.MENU, this.onAbort);
  }

  /**
   * 开始绘制事件处理
   */
  onStart() {
    const point = this.snap.getCursorPoint();

    if (this.status === 'done') {
      message.error('绘制已完成');
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
   * @param point - 起点
   */
  createBottomLine(point: Point) {
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
   * 鼠标移动事件处理
   */
  onMove() {
    const point = this.snap.getCursorPoint();

    if (this.status === 'drawing') {
      this.currentBottomLine?.drawing(point);
    }
  }

  /**
   * 终止绘制事件处理
   */
  onAbort() {
    this.status = 'idle';
    this.currentBottomLine?.abort();
    this.currentBottomLine = undefined;
  }

  /**
   * 结束绘制事件处理
   */
  onEnd() {
    this.status = 'done';
    this.currentBottomLine?.finish();
    this.currentBottomLine = undefined;
  }

  /**
   * 撤销最后一次绘制
   */
  undo() {
    if (this.bottomLineGroup.bottomLines.length === 0) return;

    this.onAbort();
    this.bottomLineGroup.pop();

    if (this.bottomLineGroup.bottomLines.length === 0) this.reset();
  }

  /**
   * 重置绘制状态
   */
  reset() {
    this.onAbort();

    this.status = 'init';
    this.currentBottomLine = undefined;
    this.bottomLineGroup.clear();
    this.debug.clear();
  }
}

export { DrawBottom };
