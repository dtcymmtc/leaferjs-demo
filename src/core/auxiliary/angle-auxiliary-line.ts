import { App, Line } from 'leafer-editor';
import {
  convertSize,
  getAngleBetweenLines,
  getLineDirection,
  getLineEndPoint,
  lineArc,
} from '../helper';
import { HintInput } from './hint-input';

/** 夹角辅助线类，用于显示线条之间的夹角 */
class AngleAuxiliaryLine {
  app: App;
  line: Line;
  curve: Line;
  hintInput: HintInput | undefined;
  suffix: string | undefined;
  defaultColor = 'rgb(153,153,153)';
  parallelColor = 'rgb(22,217,168)';

  constructor(options: { app: App; x: number; y: number }) {
    this.app = options.app;

    // 初始化直线对象
    this.line = new Line({
      x: options.x,
      y: options.y,
      strokeWidth: 0,
      stroke: this.defaultColor,
      dashPattern: [10, 10],
    });

    // 初始化曲线对象
    this.curve = new Line({
      curve: true,
      strokeWidth: 0,
      stroke: this.defaultColor,
    });

    // 将直线和曲线添加到应用的树结构中
    this.app.tree.add(this.line);
    this.app.tree.add(this.curve);

    // 初始化提示输入框
    this.hintInput = new HintInput({
      suffix: '°',
    });
  }

  /**
   * 显示夹角辅助线
   * @param line - 参考线条
   */
  show(line: Line) {
    let result = 0;
    let parallel = false;
    const width = line.width ?? 0;
    const rotation = line.rotation ?? 0;

    // 根据旋转角度设置平行状态和结果角度
    if (rotation === 0) {
      parallel = true;
      result = 0;
    } else if (rotation > 0 && rotation < 90) {
      parallel = false;
      result = 0;
    } else if (rotation === 90) {
      parallel = true;
      result = 90;
    } else if (90 < rotation && rotation < 180) {
      parallel = false;
      result = 180;
    } else if (rotation === 180) {
      parallel = true;
      result = 180;
    } else if (rotation < 0 && rotation > -90) {
      parallel = false;
      result = 0;
    } else if (rotation === -90) {
      parallel = true;
      result = -90;
    } else if (rotation < -90 && rotation > -180) {
      parallel = false;
      result = 180;
    }

    // 设置直线属性
    this.line.set({
      strokeWidth: convertSize(1),
      width,
      rotation: result,
      stroke: parallel ? this.parallelColor : this.defaultColor,
    });

    // 获取线条方向并设置曲线的曲率
    const direction = getLineDirection(line);
    const curvature = ['left-bottom', 'bottom-left', 'right-top', 'top-right'].includes(direction)
      ? -0.3
      : 0.3;

    // 设置曲线属性
    this.curve.set({
      strokeWidth: convertSize(1),
      points: lineArc(getLineEndPoint(line), getLineEndPoint(this.line), 50, curvature),
    });

    // 显示提示输入框，显示线条之间的夹角
    this.hintInput?.show(this.curve, getAngleBetweenLines(line, this.line));

    // 设置输入框的偏移值
    if (direction.includes('right')) {
      this.hintInput?.setOffset(40, 0);
    } else if (direction.includes('left')) {
      this.hintInput?.setOffset(-40, 0);
    }
  }

  /** 移除夹角辅助线 */
  remove() {
    this.line?.remove();
    this.curve?.remove();
    this.hintInput?.hide();
  }
}

export { AngleAuxiliaryLine };
