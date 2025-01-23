import { message } from 'ant-design-vue';
import { Point, PointerEvent, UIEvent } from 'leafer-editor';
import { Snap } from '../snap';
import { BasicDraw, type BasicDrawOptions } from './basic-draw';
import { BottomLine } from './bottom-line';
import { BottomLineGroup } from './bottom-line-group';

/* 绘制腔底 */
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

  onStart(node: UIEvent) {
    const x = this.snap.getCursorPoint()?.x ?? node.x;
    const y = this.snap.getCursorPoint()?.y ?? node.y;

    console.log(Snap.points, this.snap.getCursorPoint());
    const point = new Point(x, y);

    if (this.status === 'done') {
      message.error('绘制已完成');
      return;
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
    this.createBottomLine(x, y);
  }

  createBottomLine(x: number, y: number) {
    // 结束上一个底边绘制
    if (this.currentBottomLine) {
      this.currentBottomLine.finish();
      return;
    }

    // 添加起点为吸附节点
    Snap.points.push(new Point(x, y));

    this.currentBottomLine = new BottomLine({
      app: this.app,
      snap: this.snap,
      debug: this.debug,
      drawBottom: this,
      x,
      y,
      onFinish: () => {
        if (this.currentBottomLine) {
          const point = this.currentBottomLine.getEndPoint();

          // 添加终点为吸附节点
          Snap.points.push(point);

          // 记录当前底边，等待下一次绘制
          this.bottomLineGroup.push(this.currentBottomLine);
          this.currentBottomLine = undefined;

          // 创建下一个底边
          if (this.status === 'drawing') {
            this.createBottomLine(point.x, point.y);
          }

          console.log(this.bottomLineGroup);
          if (this.bottomLineGroup.drawablePoints.length === 0 && this.currentBottomLine) {
            this.onAbort();
            this.status = 'done';

            message.success('绘制完成');
          }
        }
      },
    });
  }

  onMove(node: UIEvent) {
    const x = this.snap.getCursorPoint()?.x ?? node.x;
    const y = this.snap.getCursorPoint()?.y ?? node.y;

    if (this.status === 'drawing') {
      this.currentBottomLine?.drawing(x, y);
    }
  }

  onAbort() {
    this.status = 'idle';
    this.currentBottomLine?.abort();
    this.currentBottomLine = undefined;
  }

  onEnd() {
    this.status = 'done';
    this.currentBottomLine?.finish();
    this.currentBottomLine = undefined;
  }

  undo() {
    if (this.bottomLineGroup.bottomLines.length === 0) return;

    this.onAbort();
    this.bottomLineGroup.pop();

    if (this.bottomLineGroup.bottomLines.length === 0) this.reset();
  }

  reset() {
    this.onAbort();

    this.status = 'init';
    this.currentBottomLine = undefined;
    this.bottomLineGroup.clear();
    Snap.points = [];
    this.debug.clear();
  }
}

export { DrawBottom };
