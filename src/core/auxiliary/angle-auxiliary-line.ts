import { App, Line } from 'leafer-editor';
import { getAngleBetweenLines, getLineDirection, getLineEndPoint, lineArc } from '../helper';
import { HintInput } from './hint-input';

/** 夹角辅助线 */
class AngleAuxiliaryLine {
  app: App;
  line: Line;
  curve: Line;
  hintInput: HintInput;
  suffix: string | undefined;
  defaultColor = 'rgb(116,116,116)';
  parallelColor = 'rgb(22,217,168)';

  constructor(options: { app: App; x: number; y: number }) {
    this.app = options.app;
    this.line = new Line({
      x: options.x,
      y: options.y,
      strokeWidth: 0,
      stroke: this.defaultColor,
      dashPattern: [10, 10],
    });
    this.curve = new Line({
      curve: true,
      strokeWidth: 0,
      stroke: this.defaultColor,
    });
    this.app.tree.add(this.line);
    this.app.tree.add(this.curve);
    this.hintInput = new HintInput({
      suffix: '°',
    });
  }

  show(line: Line) {
    let result = 0;
    let parallel = false;
    const width = line.width ?? 0;
    const rotation = line.rotation ?? 0;

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

    this.line.set({
      strokeWidth: 1,
      width,
      rotation: result,
      stroke: parallel ? this.parallelColor : this.defaultColor,
    });

    const direction = getLineDirection(line);
    const curvature = ['left-bottom', 'bottom-left', 'right-top', 'top-right'].includes(direction)
      ? -0.3
      : 0.3;

    this.curve.set({
      strokeWidth: 1,
      points: lineArc(getLineEndPoint(line), getLineEndPoint(this.line), 50, curvature),
    });

    this.hintInput.show(this.curve, getAngleBetweenLines(line, this.line));

    // 设置输入框的偏移值
    if (direction.includes('right')) {
      this.hintInput.setOffset(40, 0);
    } else if (direction.includes('left')) {
      this.hintInput.setOffset(-40, 0);
    }
  }

  remove() {
    this.line?.remove();
    this.curve?.remove();
    this.hintInput.hide();
  }
}

export { AngleAuxiliaryLine };
