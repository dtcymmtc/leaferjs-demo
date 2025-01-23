import { App, Line, Point } from 'leafer-editor';

/** 直线辅助线 */
class LineAuxiliaryLine {
  app: App;
  line: Line;
  defaultColor = 'rgb(22,217,168)';

  constructor(options: { app: App }) {
    this.app = options.app;
    this.line = new Line({
      strokeWidth: 1,
      stroke: this.defaultColor,
      dashPattern: [10, 10],
      visible: false,
    });
    this.app.sky.add(this.line);
  }

  show(points: Point[]) {
    this.line.set({
      points,
      visible: true,
    });
  }

  hide() {
    this.line?.set({
      visible: false,
    });
  }

  remove() {
    this.line?.remove();
  }
}

export { LineAuxiliaryLine };
