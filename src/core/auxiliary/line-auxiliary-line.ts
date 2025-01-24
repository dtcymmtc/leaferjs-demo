import { App, Line, Point } from 'leafer-editor';

/** 直线辅助线类，用于显示和管理直线辅助线 */
class LineAuxiliaryLine {
  app: App;
  line: Line;
  defaultColor = 'rgb(22,217,168)';

  constructor(options: { app: App }) {
    this.app = options.app;

    // 初始化直线对象
    this.line = new Line({
      strokeWidth: 1,
      stroke: this.defaultColor,
      dashPattern: [10, 10],
      visible: false,
    });

    // 将直线添加到应用的天空层中
    this.app.sky.add(this.line);
  }

  /**
   * 显示直线辅助线
   * @param points - 直线的点数组
   */
  show(points: Point[]) {
    this.line.set({
      points,
      visible: true,
    });
  }

  /** 隐藏直线辅助线 */
  hide() {
    this.line?.set({
      visible: false,
    });
  }

  /** 移除直线辅助线 */
  remove() {
    this.line?.remove();
  }
}

export { LineAuxiliaryLine };
