<template>
  <div></div>
</template>
<script setup lang="ts">
import {
  App,
  Bounds,
  Ellipse,
  LeafList,
  Line,
  Point,
  PointerEvent,
  PropertyEvent,
  UIEvent,
} from 'leafer-editor';
import { DotMatrix } from 'leafer-x-dot-matrix';

enum BottomLineStatus {
  Idle = 'BottomLineIdle',
  Drawing = 'BottomLineDrawing',
  Finish = 'BottomLineFinish',
}

const app = new App({
  view: window,
  editor: {}, // 会自动创建 editor实例、tree层、sky层
});

// 创建点阵实例
const dotMatrix = new DotMatrix(app);
// 启用点阵显示
dotMatrix.enableDotMatrix(true);

const getBoundsCenter = (bounds: Bounds) => {
  return new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
};

/** 计算弧线的点 */
const lineArc = (start: Point, end: Point, numPoints = 5, curvature = 0.5) => {
  const points = [];

  // 计算线段的中点
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  // 计算垂直于线段的方向向量
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // 计算弧线的最高点，偏离中点的距离（与曲率相关）
  const offsetX = -dy * curvature;
  const offsetY = dx * curvature;

  // 最高点的坐标
  const arcPeakX = midX + offsetX;
  const arcPeakY = midY + offsetY;

  // 生成弧线上的点
  for (let i = 0; i <= numPoints - 1; i++) {
    const t = i / (numPoints - 1); // 归一化参数，范围 [0, 1]

    // 二次贝塞尔曲线公式：B(t) = (1 - t)^2 * P0 + 2(1 - t)t * P1 + t^2 * P2
    const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * arcPeakX + t * t * end.x;

    const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * arcPeakY + t * t * end.y;

    points.push({ x, y });
  }

  return points;
};

/** 获取吸附点 */
function snapToPoints(mousePos: Point, points: Point[], threshold = 10) {
  // 存储不同类型的吸附点
  const horizontalTargets: Point[] = []; // 水平吸附点
  const verticalTargets: Point[] = []; // 垂直吸附点
  const overlapTargets: Point[] = []; // 重合吸附点
  const intersectionTargets: Point[] = []; // 相交吸附点

  // 第一次遍历：找出所有可能的吸附点
  for (const point of points) {
    const dx = Math.abs(point.x - mousePos.x);
    const dy = Math.abs(point.y - mousePos.y);

    if (dx <= threshold && dy <= threshold) {
      // 重合吸附
      overlapTargets.push(point);
    } else {
      // 水平吸附
      if (dy <= threshold) {
        horizontalTargets.push(point);
      }
      // 垂直吸附
      if (dx <= threshold) {
        verticalTargets.push(point);
      }
    }
  }

  // 第二次遍历：寻找交点
  const intersectionPoints: Point[] = [];
  for (const hPoint of horizontalTargets) {
    for (const vPoint of verticalTargets) {
      // 创建交点
      const intersectionPoint = new Point(vPoint.x, hPoint.y);
      // 检查交点是否在鼠标附近
      const dx = Math.abs(intersectionPoint.x - mousePos.x);
      const dy = Math.abs(intersectionPoint.y - mousePos.y);
      if (dx <= threshold && dy <= threshold) {
        intersectionPoints.push(intersectionPoint);
        intersectionTargets.push(hPoint, vPoint);
      }
    }
  }

  // 按优先级返回吸附结果
  if (overlapTargets.length > 0) {
    // 优先级1：重合
    return {
      snapPoint: overlapTargets[0],
      targets: overlapTargets,
      type: 'overlap',
    };
  }

  if (intersectionPoints.length > 0) {
    // 优先级2：交点
    return {
      snapPoint: intersectionPoints[0],
      targets: intersectionTargets,
      type: 'intersection',
    };
  }

  if (horizontalTargets.length > 0) {
    // 优先级3：水平
    return {
      snapPoint: new Point(mousePos.x, horizontalTargets[0].y),
      targets: horizontalTargets,
      type: 'horizontal',
    };
  }

  if (verticalTargets.length > 0) {
    // 优先级4：垂直
    return {
      snapPoint: new Point(verticalTargets[0].x, mousePos.y),
      targets: verticalTargets,
      type: 'vertical',
    };
  }

  // 没有吸附
  return {
    snapPoint: null,
    targets: [],
    type: 'none',
  };
}

/** 获取线段的方向 */
const getLineDirection = (line: Line) => {
  const angle = line.rotation ?? 0;

  if (angle === 0) return 'right';
  if (angle > 0 && angle < 45) return 'right-bottom';
  if (angle >= 45 && angle < 90) return 'bottom-right';
  if (angle === 90) return 'bottom';
  if (angle >= 90 && angle < 135) return 'bottom-left';
  if (angle >= 135 && angle < 180) return 'left-bottom';
  if (angle === 180) return 'left';
  if (angle >= -180 && angle < -135) return 'left-top';
  if (angle >= -135 && angle < -90) return 'top-left';
  if (angle === -90) return 'top';
  if (angle >= -90 && angle < -45) return 'top-right';
  if (angle >= -45 && angle < 0) return 'right-top';

  return 'unknown';
};

/** 获取线段的终点坐标 */
const getLineEndPoint = (line: Line) => {
  const x1 = line.getComputedAttr('x') ?? 0;
  const y1 = line.getComputedAttr('y') ?? 0;
  const rotation = line.getComputedAttr('rotation') ?? 0;
  const width = line.getComputedAttr('width') ?? 0;

  const radians = (rotation * Math.PI) / 180;
  const x2 = x1 + width * Math.cos(radians);
  const y2 = y1 + width * Math.sin(radians);
  return new Point(x2, y2);
};

const getAngleBetweenLines = (line1: Line, line2: Line) => {
  const line1End = getLineEndPoint(line1);
  const line2End = getLineEndPoint(line2);

  const vector1 = { x: line1End.x - line1.x!, y: line1End.y - line1.y! };
  const vector2 = { x: line2End.x - line2.x!, y: line2End.y - line2.y! };

  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
  const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
  const cosTheta = dotProduct / (magnitude1 * magnitude2);
  const angle = Math.acos(cosTheta) * (180 / Math.PI); // 将弧度转换为角度
  return angle;
};

/** 吸附 */
class Snap {
  app: App;
  cursor: Ellipse | undefined;
  lineAuxiliaryLine: LineAuxiliaryLine[] = [];
  static points: Point[] = [];

  constructor(options: { app: App }) {
    this.app = options.app;
    this.app = app;

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

    // 创建辅助线
    // this.lineAuxiliaryLine = new LineAuxiliaryLine({ app: this.app });

    // 将鼠标指针添加到 sky 层
    this.app.sky.add(this.cursor);

    // 监听鼠标移动事件
    this.app.on(PointerEvent.MOVE, (event) => {
      const currentUi = this.app.findOne(`.${BottomLineStatus.Drawing}`);
      // const [snapPoint, targetPoint] = getSnapPoint(event.x, event.y, Snap.points);
      const { snapPoint, targets, type } = snapToPoints(new Point(event.x, event.y), Snap.points);
      console.log(type, targets);

      this.lineAuxiliaryLine.forEach((line) => line.remove());
      this.lineAuxiliaryLine = [];

      if (snapPoint) {
        this.cursor?.set({
          x: snapPoint.x,
          y: snapPoint.y,
          visible: true,
        });
        // this.lineAuxiliaryLine?.show([targetPoint, snapPoint]);

        if (currentUi instanceof Line) {
          currentUi.set({
            toPoint: {
              x: snapPoint.x - (currentUi.x ?? 0),
              y: snapPoint.y - (currentUi.y ?? 0),
            },
          });
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
}

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

/** 提示输入框 */
class HintInput {
  input: HTMLInputElement = document.createElement('input');
  timer: number | undefined = undefined;
  autoFocus = false;
  suffix: string | undefined;

  constructor(options?: {
    autoFocus?: boolean;
    suffix?: string;
    onChange?: (value: string) => void;
  }) {
    document.body.appendChild(this.input);

    this.autoFocus = options?.autoFocus ?? false;
    this.suffix = options?.suffix;
    this.input.tabIndex = 1;
    this.input.style.width = '50px';
    this.input.style.display = 'none';
    this.input.style.position = 'absolute';
    this.input.style.transform = 'translate(-50%, -50%)';
    this.input.style.border = '1px solid #000';
    this.input.style.textAlign = 'center';
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.hide();
        options?.onChange?.(this.input.value);
      }
    });
  }

  hide() {
    this.input.style.display = 'none';

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.input.blur();
  }

  show(line: Line, num?: number) {
    if (!num) {
      this.hide();
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.input.blur();

    // 获取输入框的坐标
    const center = getBoundsCenter(new Bounds(line.getBounds()));

    this.input.style.display = 'block';
    this.input.style.left = `${center.x}px`;
    this.input.style.top = `${center.y}px`;
    this.input.value = `${Math.ceil(num ?? 0)}${this.suffix ?? ''}`;

    if (this.autoFocus) {
      this.timer = setTimeout(() => {
        this.input.focus();
        this.input.select();
      }, 400);
    }
  }

  setOffset(x: number, y: number) {
    this.input.style.marginTop = `${y}px`;
    this.input.style.marginLeft = `${x}px`;
  }
}

/** 底边 */
class BottomLine {
  app: App;
  line: Line;
  hintInput: HintInput;
  angleAuxiliaryLine: AngleAuxiliaryLine;

  constructor(options: { app: App; x: number; y: number; onFinish?: () => void }) {
    this.app = options.app;
    this.line = new Line({
      width: 0,
      strokeWidth: 16,
      x: options.x,
      y: options.y,
      stroke: 'rgb(192,210,237)',
      className: BottomLineStatus.Idle,
    });

    this.hintInput = new HintInput({
      autoFocus: true,
      onChange: (value) => {
        if (this.line) {
          this.line.width = Number(value);
          this.getEndPoint();
          this.finish();
          options.onFinish?.();
        }
      },
    });

    this.angleAuxiliaryLine = new AngleAuxiliaryLine({
      app: this.app,
      x: options.x,
      y: options.y,
    });

    this.line.on(PropertyEvent.CHANGE, () => {
      // 更新输入框信息
      this.hintInput.show(this.line, this.line.width);

      // 更新辅助线信息
      this.angleAuxiliaryLine.show(this.line);
    });

    Snap.points.push(new Point(this.line.x, this.line.y));
  }

  getEndPoint() {
    const { x, y } = getLineEndPoint(this.line);
    return { x, y };
  }

  drawing(x: number, y: number) {
    this.line.set({
      // 需要减去起点坐标
      toPoint: {
        x: x - (this.line.x ?? 0),
        y: y - (this.line.y ?? 0),
      },
      className: BottomLineStatus.Drawing,
    });
  }

  /** 完成绘制 */
  finish() {
    this.line.set({
      stroke: 'rgb(166, 166, 166)',
      className: BottomLineStatus.Finish,
    });
    this.hintInput.hide();
    this.angleAuxiliaryLine.remove();

    Snap.points.push(getLineEndPoint(this.line));
  }

  /** 终止绘制 */
  abort() {
    this.line?.remove();
    this.hintInput.hide();
    this.angleAuxiliaryLine.remove();
  }
}

/* 绘制腔底 */
class DrawBottom {
  app: App;
  lines: LeafList = new LeafList();
  currentBottomLine: BottomLine | undefined = undefined;
  status: 'idle' | 'drawing' = 'idle';

  constructor(app: App) {
    this.app = app;

    this.onStart = this.onStart.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onEnd = this.onEnd.bind(this);

    this.app.on(PointerEvent.CLICK, this.onStart);
    this.app.on(PointerEvent.MOVE, this.onMove);
    this.app.on(PointerEvent.MENU, this.onEnd);
  }

  onStart(node: UIEvent) {
    let x = node.x;
    let y = node.y;

    if (this.status === 'drawing' && this.currentBottomLine) {
      x = this.currentBottomLine.getEndPoint().x;
      y = this.currentBottomLine.getEndPoint().y;
      this.onInflection();
    }

    this.status = 'drawing';
    this.currentBottomLine = new BottomLine({
      app: this.app,
      x,
      y,
      onFinish: () => {
        if (this.currentBottomLine) {
          this.onStart(new UIEvent(this.currentBottomLine.getEndPoint()));
        }
      },
    });
    this.app.tree.add(this.currentBottomLine.line);
  }

  onMove(node: UIEvent) {
    if (this.status === 'drawing' && this.currentBottomLine) {
      this.currentBottomLine.drawing(node.x, node.y);
    }
  }

  onInflection() {
    this.status = 'idle';
    this.currentBottomLine?.finish();
  }

  onEnd() {
    this.status = 'idle';
    this.currentBottomLine?.abort();
  }
}

new DrawBottom(app);
new Snap({ app });
</script>
