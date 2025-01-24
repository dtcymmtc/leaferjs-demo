import { Bounds, Line, Point, PropertyEvent } from 'leafer-editor';
import { AngleAuxiliaryLine, HintInput } from '../auxiliary';
import { BottomLineStatus } from '../constants';
import { getIntersection, getLineEndPoint } from '../helper';
import { BasicDraw, type BasicDrawOptions } from './basic-draw';
import { DrawBottom } from './draw-bottom';

interface BottomLineOptions extends BasicDrawOptions {
  drawBottom: DrawBottom;
  start: Point;
  onFinish?: () => void;
  onChange?: () => void;
}

/** 底边类，用于绘制和管理底边线 */
class BottomLine extends BasicDraw {
  private line: Line;
  defaultColor = 'rgb(192,210,237)';
  hitColor = 'rgb(255, 0, 0)';
  finishColor = 'rgb(166, 166, 166)';
  hintInput: HintInput;
  angleAuxiliaryLine: AngleAuxiliaryLine;
  hit: boolean = false;
  finishCallback: (() => void) | undefined;
  start: Point;
  drawBottom: DrawBottom;

  constructor(options: BottomLineOptions) {
    super(options);

    this.start = options.start;
    this.drawBottom = options.drawBottom;
    this.finishCallback = options.onFinish;

    // 初始化线条对象
    this.line = new Line({
      width: 0,
      strokeWidth: 16,
      x: this.start.x,
      y: this.start.y,
      stroke: this.defaultColor,
      className: BottomLineStatus.Idle,
    });

    // 初始化提示输入框
    this.hintInput = new HintInput({
      autoFocus: true,
      onChange: (value) => {
        if (this.line) {
          this.line.width = Number(value);
          this.getEndPoint();
          this.finish();
        }
      },
    });

    // 初始化角度辅助线
    this.angleAuxiliaryLine = new AngleAuxiliaryLine({
      app: this.app,
      x: this.start.x,
      y: this.start.y,
    });

    // 监听线条属性变化事件
    this.line.on(PropertyEvent.CHANGE, (e) => {
      if (!['rotation', 'width'].includes(e.attrName)) return;

      // 更新输入框信息
      this.hintInput.show(this.line, this.line.width);

      // 更新辅助线信息
      this.angleAuxiliaryLine.show(this.line);

      // 检测是否与其他底边碰撞
      this.hit = this.isHit(this);

      options.onChange?.();
    });

    // 将线条添加到应用的树结构中
    this.app.tree.add(this.line);
  }

  /** 判断当前线条是否与其他底边碰撞 */
  isHit(line: BottomLine): boolean {
    let result = false;
    for (const otherLine of this.drawBottom.bottomLineGroup.bottomLines) {
      const points = getIntersection(line.getLine(), otherLine.getLine());

      points.forEach((point) => {
        const drawablePoint = this.drawBottom.bottomLineGroup.drawablePoints.find((item) => {
          return item.x === point.x && item.y === point.y;
        });
        // 与可绘制的点重合不算相交
        if (drawablePoint) {
          return;
        }

        result = true;
      });
    }

    return result;
  }

  /** 获取线条对象 */
  getLine() {
    return this.line;
  }

  /** 获取线条起点 */
  getStartPoint() {
    return new Point(this.line.x, this.line.y);
  }

  /** 获取线条终点 */
  getEndPoint() {
    return getLineEndPoint(this.line);
  }

  /** 获取线条边界 */
  getBounds() {
    return new Bounds(this.line.getBounds());
  }

  /** 绘制线条 */
  drawing(point: Point) {
    this.line.set({
      // 需要减去起点坐标
      toPoint: {
        x: point.x - (this.line.x ?? 0),
        y: point.y - (this.line.y ?? 0),
      },
      className: BottomLineStatus.Drawing,
      stroke: this.hit ? this.hitColor : this.defaultColor,
    });
  }

  /** 完成绘制 */
  finish() {
    this.line.set({
      stroke: this.finishColor,
      className: BottomLineStatus.Finish,
    });
    this.hintInput.hide();
    this.debug.log(
      `--------------底边${this.drawBottom.bottomLineGroup.bottomLines.length + 1}--------------`,
    );
    this.debug.log('长度', this.line.width, '角度', this.line.rotation);
    this.debug.log(
      '起点',
      this.line.x,
      this.line.y,
      '终点',
      this.getEndPoint().x,
      this.getEndPoint().y,
    );

    this.angleAuxiliaryLine.remove();

    this.finishCallback?.();
  }

  /** 终止绘制 */
  abort() {
    this.remove();
    this.hintInput.hide();
    this.angleAuxiliaryLine.remove();
  }

  /** 移除线条 */
  remove() {
    this.line?.remove();
  }
}

export { BottomLine };
