import { App, Ellipse, Line, Point, PointerEvent } from 'leafer-editor';
import { LineAuxiliaryLine } from '../auxiliary';
import { BottomLineStatus } from '../constants';
import { snapToPoints } from '../helper';

/** 吸附 */
class Snap {
  app: App;
  cursor: Ellipse | undefined;
  lineAuxiliaryLine: LineAuxiliaryLine[] = [];
  static points: Point[] = [];

  constructor(options: { app: App }) {
    this.app = options.app;

    // 创建鼠标指针
    this.cursor = new Ellipse({
      width: 16,
      height: 16,
      offsetX: -8,
      offsetY: -8,
      strokeWidth: 1,
      stroke: 'rgb(255, 0, 0)',
      fill: 'rgb(255, 255, 255)',
      visible: false,
    });

    // 将鼠标指针添加到 sky 层
    this.app.sky.add(this.cursor);

    // 监听鼠标移动事件
    this.app.on(PointerEvent.MOVE, (event) => {
      const currentUi = this.app.findOne(`.${BottomLineStatus.Drawing}`);
      const { snapPoint, targets } = snapToPoints(new Point(event.x, event.y), Snap.points);

      // 清空辅助线
      this.lineAuxiliaryLine.forEach((line) => line.remove());
      this.lineAuxiliaryLine = [];

      if (snapPoint) {
        this.cursor?.set({
          x: snapPoint.x,
          y: snapPoint.y,
          visible: true,
        });

        if (currentUi instanceof Line) {
          // currentUi.set({
          //   toPoint: {
          //     x: snapPoint.x - (currentUi.x ?? 0),
          //     y: snapPoint.y - (currentUi.y ?? 0),
          //   },
          // });
        }

        targets.forEach((target) => {
          const lineAuxiliaryLine = new LineAuxiliaryLine({ app: this.app });
          lineAuxiliaryLine.show([target, snapPoint]);
          this.lineAuxiliaryLine.push(lineAuxiliaryLine);
        });
      } else {
        this.cursor?.set({
          x: event.x,
          y: event.y,
          visible: false,
        });
      }
    });
  }

  getCursorPoint() {
    return this.cursor?.visible ? new Point(this.cursor.x, this.cursor.y) : undefined;
  }
}

export { Snap };
