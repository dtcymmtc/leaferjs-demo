import { Bounds, Line, Point, PropertyEvent } from 'leafer-editor';
import { AngleAuxiliaryLine, HintInput } from '../auxiliary';
import type { EdgeAnnotationsUpdateOptions } from '../auxiliary/edge-annotations';
import { BasicDraw, type BasicDrawOptions } from '../basic/basic-draw';
import { BottomLineStatus, DEFAULT_BOTTOM_LINE_WIDTH } from '../constants';
import {
  convertSize,
  getIntersection,
  getLineDirection,
  getLineEndPoint,
  getLinePoints,
  setLineStartEndPoint,
} from '../helper';
import { DrawBottom } from './draw-bottom';

/**
 * @typedef {Object} BottomLineOptions
 * @extends BasicDrawOptions
 * @property {DrawBottom} drawBottom - 绘制腔底实例
 * @property {Point} start - 起点
 * @property {Function} [onFinish] - 完成回调
 * @property {Function} [onChange] - 变化回调
 * @property {Function} [onModify] - 修改回调
 */
interface BottomLineOptions extends BasicDrawOptions {
  drawBottom: DrawBottom;
  start: Point;
  onFinish?: () => void;
  onChange?: () => void;
  onModify?: (bottomLine: BottomLine, value: number) => void;
}

/**
 * 底边类，用于绘制和管理底边线
 * @extends BasicDraw
 */
class BottomLine extends BasicDraw {
  private line: Line;
  private hintInput: HintInput;
  private angleAuxiliaryLine: AngleAuxiliaryLine;
  private drawBottom: DrawBottom;
  defaultColor = 'rgb(150,197,250)';
  hitColor = 'rgb(225,33,0)';
  finishColor = 'rgb(140,140,140)';
  hoverColor = 'rgb(175,210,250)';
  selectedColor = 'rgb(110,170,250)';
  hit: boolean = false;
  finishCallback: BottomLineOptions['onFinish'];
  modifyCallback: BottomLineOptions['onModify'];
  start: Point;

  /**
   * @param {BottomLineOptions} options - 配置选项
   */
  constructor(options: BottomLineOptions) {
    super(options);

    this.start = options.start;
    this.drawBottom = options.drawBottom;
    this.finishCallback = options.onFinish;
    this.modifyCallback = options.onModify;

    // 初始化线条对象
    this.line = new Line({
      width: 0,
      strokeWidth: convertSize(DEFAULT_BOTTOM_LINE_WIDTH),
      x: this.start.x,
      y: this.start.y,
      stroke: this.defaultColor,
      className: BottomLineStatus.Idle,
    });

    // 初始化提示输入框
    this.hintInput = new HintInput({
      app: this.app,
      debug: this.debug,
      snap: this.snap,
      autoFocus: true,
      onChange: (value) => {
        if (this.line) {
          if (this.isSelected()) {
            this.normal();
            this.modifyCallback?.(this, Number(value));
          } else {
            this.line.width = Number(value);
            this.finish();
          }
        }
      },
    });

    // 初始化角度辅助线
    this.angleAuxiliaryLine = new AngleAuxiliaryLine({
      app: this.app,
      snap: this.snap,
      debug: this.debug,
      x: this.start.x,
      y: this.start.y,
    });

    // 监听线条属性变化事件
    this.line.on(PropertyEvent.CHANGE, (e) => {
      if (!['rotation', 'width'].includes(e.attrName)) return;
      if (this.isFinish()) return;
      if (this.isSelected()) return;

      // 更新输入框信息
      this.showHintInput();

      // 更新辅助线信息
      if (this.drawBottom.showAngle) {
        this.showAngleAuxiliaryLine();
      } else {
        this.hideAngleAuxiliaryLine();
      }

      // 检测是否与其他底边碰撞
      this.hit = this.isHit(this);

      options.onChange?.();
    });

    // 将线条添加到应用的树结构中
    this.app.tree.add(this.line);
  }

  /**
   * 判断当前线条是否与其他底边碰撞
   * @param {BottomLine} line - 当前线条
   * @returns {boolean} 是否碰撞
   */
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

  /**
   * 获取线条对象
   * @returns {Line} 线条对象
   */
  getLine() {
    return this.line;
  }

  /**
   * 获取线条起点
   * @returns {Point} 起点
   */
  getStartPoint() {
    return new Point(this.line.x, this.line.y);
  }

  /**
   * 获取线条终点
   * @returns {Point} 终点
   */
  getEndPoint() {
    return getLineEndPoint(this.line);
  }

  /**
   * 获取线条起终点
   * @returns {Point[]} 起终点数组
   */
  getPoints() {
    return getLinePoints(this.line);
  }

  /**
   * 获取线条边界
   * @returns {Bounds} 线条边界
   */
  getBounds() {
    return new Bounds(this.line.getBounds());
  }

  /**
   * 设置底边起终点
   * @param {Point} start - 起点
   * @param {Point} end - 终点
   */
  setStartEndPoint(start: Point, end: Point) {
    setLineStartEndPoint(this.line, start, end);
  }

  /**
   * 绘制线条
   * @param {Point} point - 当前点
   */
  drawing(point: Point) {
    this.line.set({
      className: BottomLineStatus.Drawing,
      stroke: this.hit ? this.hitColor : this.defaultColor,
    });
    setLineStartEndPoint(this.line, this.start, point);

    if (this.drawBottom.orthogonal) {
      const direction = getLineDirection(this.line);

      // 正交映射
      const orthogonalMap: Record<typeof direction, number> = {
        right: 0,
        'right-bottom': 0,
        'bottom-right': 90,
        bottom: 90,
        'bottom-left': 90,
        'left-bottom': 180,
        left: 180,
        'left-top': 180,
        'top-left': -90,
        top: -90,
        'top-right': -90,
        'right-top': -0,
        unknown: 0,
      };

      this.line.set({
        rotation: orthogonalMap[direction],
      });
    }
  }

  /**
   * 完成绘制
   */
  finish() {
    this.line.set({
      stroke: this.finishColor,
      className: BottomLineStatus.Finish,
    });
    this.hintInput.hideInput();
    this.hintInput.hideAnnotation();
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

  /**
   * 终止绘制
   */
  abort() {
    this.remove();
    this.hideHintInput();
    this.angleAuxiliaryLine.remove();
  }

  /**
   * 移除线条
   */
  remove() {
    this.hideHintInput();
    this.hideAnnotation();
    this.angleAuxiliaryLine.remove();
    this.line?.remove();
  }

  /**
   * 显示提示
   */
  showHintInput() {
    this.hintInput.showInput(this.line, this.line.width);
  }

  /**
   * 隐藏提示
   */
  hideHintInput() {
    this.hintInput.hideInput();
  }

  /**
   * 显示标注
   * @param {EdgeAnnotationsUpdateOptions} [options] - 标注更新选项
   */
  showAnnotation(options?: EdgeAnnotationsUpdateOptions) {
    // 如果有传入点，则使用传入的点，保证绘制方向正确
    if (options?.points) {
      this.setStartEndPoint(options.points[0], options.points[1]);
    }

    this.hintInput.showAnnotation(this.line, options);
  }

  /**
   * 隐藏标注
   */
  hideAnnotation() {
    this.hintInput.hideAnnotation();
  }

  /**
   * 显示夹角辅助线
   */
  showAngleAuxiliaryLine() {
    this.angleAuxiliaryLine.show(this.line);
  }

  /**
   * 隐藏夹角辅助线
   */
  hideAngleAuxiliaryLine() {
    this.angleAuxiliaryLine.hide();
  }

  /**
   * 选中
   */
  select() {
    if (this.isSelected()) return;

    this.line.set({
      stroke: this.selectedColor,
    });
    this.showHintInput();
  }

  /**
   * 是否选中
   * @returns {boolean} 是否选中
   */
  isSelected() {
    return this.line.stroke === this.selectedColor;
  }

  /**
   * 是否结束
   * @returns {boolean} 是否结束
   */
  isFinish() {
    return this.line.stroke === this.finishColor;
  }

  /**
   * 经过
   */
  hover() {
    this.line.set({
      stroke: this.hoverColor,
    });
  }

  /**
   * 正常
   */
  normal() {
    this.line.set({
      stroke: this.finishColor,
    });
    this.hideHintInput();
    this.showAnnotation({
      showLabel: true,
    });
  }

  /**
   * 闭合
   */
  close() {
    this.hideHintInput();
    this.showAnnotation({
      showLabel: true,
    });
  }

  /**
   * 开放
   */
  open() {
    this.hideHintInput();
  }
}

export { BottomLine };
