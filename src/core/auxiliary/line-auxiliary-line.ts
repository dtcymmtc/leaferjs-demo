import { App, Line, Point } from 'leafer-editor';
import { convertSize } from '../helper';

/**
 * 直线辅助线类，用于显示和管理直线辅助线
 */
class LineAuxiliaryLine {
  private app: App;
  private line: Line;
  private defaultColor = 'rgb(22,217,168)';

  /**
   * 创建一个直线辅助线实例
   * @param {Object} options - 配置选项
   * @param {App} options.app - 应用实例
   */
  constructor(options: { app: App }) {
    this.app = options.app;

    // 初始化直线对象
    this.line = new Line({
      strokeWidth: convertSize(1),
      stroke: this.defaultColor,
      dashPattern: [convertSize(10), convertSize(10)],
      visible: false,
    });

    // 将直线添加到应用的天空层中
    this.app.tree.add(this.line);
  }

  /**
   * 显示直线辅助线
   * @param {Point[]} points - 直线的点数组
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
