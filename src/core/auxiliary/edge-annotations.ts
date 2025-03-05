import { Box, Line, Point, UI } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from '../basic/basic-draw';
import { DEFAULT_BOTTOM_LINE_WIDTH } from '../constants';
import { calculateAreaSign, convertSize, getLineDirection, setLineStartEndPoint } from '../helper';

/**
 * @typedef {Object} AnnotationLabel
 * @property {Point} position - 标签中心坐标
 * @property {number} angle - 标签旋转角度（度）
 * @property {number} length - 对应边的实际长度（像素）
 * @property {string} direction - 标签方向
 * @property {number} labelAngle - 标签旋转角度
 */
type AnnotationLabel = {
  position: Point;
  angle: number;
  length: number;
  direction: string;
  labelAngle: number;
};

/**
 * @typedef {Object} Annotations
 * @property {Point[][]} lines - 偏移后的辅助线集合（每条边对应一条偏移线）
 * @property {AnnotationLabel[]} labels - 边长标签集合
 */
type Annotations = {
  lines: Point[][];
  labels: AnnotationLabel[];
};

/**
 * @typedef {Object} EdgeAnnotationsOptions
 * @extends BasicDrawOptions
 * @property {Point[]} points - 顶点数组
 * @property {'polygon' | 'line' | 'arc'} type - 图形类型
 * @property {boolean} [showLabel] - 是否显示标签
 * @property {boolean} [showLine] - 是否显示线条
 * @property {boolean} [isCCW] - 是否逆时针
 */
interface EdgeAnnotationsOptions extends BasicDrawOptions {
  points?: Point[];
  type?: 'polygon' | 'line' | 'arc';
  showLabel?: boolean;
  showLine?: boolean;
  isCCW?: boolean;
}

export type EdgeAnnotationsUpdateOptions = Pick<
  EdgeAnnotationsOptions,
  'points' | 'type' | 'showLabel' | 'showLine' | 'isCCW'
>;

/**
 * 边标注工具类，用于在图形边线外侧生成尺寸标注
 * @extends BasicDraw
 */
class EdgeAnnotations extends BasicDraw {
  /**
   * 标注线距离原始边线的偏移距离（像素）
   * @type {number}
   * @private
   */
  private readonly offset = convertSize(6);

  /**
   * 原始边线宽度，用于计算有效偏移量
   * @type {number}
   * @private
   */
  private readonly strokeWidth = convertSize(DEFAULT_BOTTOM_LINE_WIDTH);

  /**
   * UI 数据
   * @type {UI[]}
   * @private
   */
  private uiData: UI[] = [];

  /**
   * 是否显示标签
   * @type {boolean}
   * @private
   */
  private showLabel: boolean;

  /**
   * 是否显示线条
   * @type {boolean}
   * @private
   */
  private showLine: boolean;

  /**
   * 图形类型
   * @type {'polygon' | 'line' | 'arc'}
   * @private
   */
  private type: EdgeAnnotationsOptions['type'];

  /**
   * 顶点数组
   * @type {Required<EdgeAnnotationsOptions>['points']}
   * @private
   */
  private points: Required<EdgeAnnotationsOptions>['points'];

  /**
   * 是否逆时针
   * @type {boolean}
   * @private
   */
  private isCCW: boolean;

  /**
   * 标注信息
   * @type {Annotations}
   */
  annotations: Annotations = { lines: [], labels: [] };

  /**
   * 构造函数
   * @param {EdgeAnnotationsOptions} options - 配置选项
   */
  constructor(options: EdgeAnnotationsOptions) {
    super(options);

    this.showLabel = options.showLabel ?? true;
    this.showLine = options.showLine ?? true;
    this.type = options.type;
    this.points = options.points ?? [];
    this.isCCW = options.isCCW ?? false;

    this.update();
  }

  /**
   * 更新标注信息
   * @param {EdgeAnnotationsUpdateOptions} [options] - 更新选项
   */
  update(options?: EdgeAnnotationsUpdateOptions) {
    this.remove();

    this.points = options?.points ?? this.points;
    this.type = options?.type ?? this.type;
    this.showLabel = options?.showLabel ?? this.showLabel;
    this.showLine = options?.showLine ?? this.showLine;
    this.isCCW = options?.isCCW ?? this.isCCW;

    if (this.points.length < 2) return;

    if (this.type === 'polygon') {
      this.annotations = this.generatePolygonAnnotations(this.points);
      this.renderAnnotations(this.annotations);
    } else if (this.type === 'line') {
      this.annotations = this.generateLineAnnotations(this.points);
      this.renderAnnotations(this.annotations);
    } else if (this.type === 'arc') {
      this.annotations = this.generateArcAnnotations(this.points);
      this.renderAnnotations(this.annotations);
    }
  }

  /**
   * 生成多边形边线标注信息
   * @param {Point[]} vertices - 多边形顶点数组（有序排列）
   * @returns {Annotations} 包含偏移线和标签数据的标注信息
   * @private
   */
  private generatePolygonAnnotations(vertices: Point[]): Annotations {
    const area = calculateAreaSign(vertices);
    const isCCW = area > 0; // 逆时针标志

    const annotations: Annotations = { lines: [], labels: [] };

    for (let i = 0; i < vertices.length; i++) {
      const A = vertices[i];
      const B = vertices[(i + 1) % vertices.length];

      const result = this.generateAnnotations(A, B, isCCW);

      annotations.lines.push(result.line);
      annotations.labels.push(result.label);
    }

    return annotations;
  }

  /**
   * 生成线段标注信息
   * @param {Point[]} vertices - 线段顶点数组
   * @returns {Annotations} 包含偏移线和标签数据的标注信息
   * @private
   */
  private generateLineAnnotations(vertices: Point[]): Annotations {
    const result = this.generateAnnotations(vertices[0], vertices[1], this.isCCW);

    return {
      lines: [result.line],
      labels: [result.label],
    };
  }

  /**
   * 生成弧线标注信息
   * @param {Point[]} arcPoints - 构成弧线的离散点
   * @returns {Annotations} 完整的标注信息，包含若干个分段偏移线 + 一个整体长度标签
   * @private
   */
  private generateArcAnnotations(arcPoints: Point[]): Annotations {
    // 如果点数少于2，无意义
    if (arcPoints.length < 2) return { lines: [], labels: [] };

    const effectiveOffset = this.offset + this.strokeWidth / 2;
    let totalLength = 0;

    // 将所有微线段的偏移后坐标存入
    const offsetLines: Point[] = [];
    // 储存每个小段的长度，用于后续计算中点
    const segmentLengths: number[] = [];

    // 分段处理每对相邻点
    for (let i = 0; i < arcPoints.length - 1; i++) {
      const A = arcPoints[i];
      const B = arcPoints[i + 1];

      // 计算长度
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const segLen = Math.hypot(dx, dy);
      if (segLen === 0) continue;

      totalLength += segLen;
      segmentLengths.push(segLen);

      // 默认弧线“外法线”可直接使用 (dy, -dx) 类似逆时针
      const nx = dy / segLen;
      const ny = -dx / segLen;

      // 偏移后
      const A_prime = new Point({ x: A.x + effectiveOffset * nx, y: A.y + effectiveOffset * ny });
      const B_prime = new Point({ x: B.x + effectiveOffset * nx, y: B.y + effectiveOffset * ny });

      offsetLines.push(A_prime, B_prime);
    }

    // 将所有偏移后的小段线放入 annotations
    const annotations: Annotations = { lines: [], labels: [] };
    annotations.lines.push([...offsetLines]);

    // 计算弧线总长度后，找到标注位置（简单取弧线的中点）
    // 注意：真实弧线可以沿着弧长一半处查找坐标；这里为演示做法，简单取点集大约中段点
    let targetIndex = 0;
    let halfLength = totalLength / 2;
    while (targetIndex < segmentLengths.length && halfLength > segmentLengths[targetIndex]) {
      halfLength -= segmentLengths[targetIndex];
      targetIndex++;
    }
    // 如若超过最后一段，默认取最后一段
    if (targetIndex >= segmentLengths.length) targetIndex = segmentLengths.length - 1;

    // 在剩余半段长的比例位置处插值坐标
    const A = arcPoints[targetIndex];
    const B = arcPoints[targetIndex + 1] ?? A;
    const segLen = segmentLengths[targetIndex];
    const ratio = segLen > 0 ? halfLength / segLen : 0;

    // 中点坐标
    const midPoint = new Point({
      x: A.x + ratio * (B.x - A.x),
      y: A.y + ratio * (B.y - A.y),
    });

    // 标签角度采用最终小段的角度
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    // 生成一个简化的标签
    annotations.labels.push({
      position: midPoint,
      length: totalLength,
      direction: '', // 可结合 getLineDirection 做进一步处理
      angle: angleDeg,
      labelAngle: 0,
    });

    return annotations;
  }

  /**
   * 生成边线标注信息
   * @param {Point} A - 边线起点
   * @param {Point} B - 边线终点
   * @param {boolean} isCCW - 是否逆时针
   * @returns {Object} 包含偏移线和标签数据的标注信息
   * @private
   */
  private generateAnnotations(A: Point, B: Point, isCCW: boolean) {
    const effectiveOffset = this.offset + this.strokeWidth / 2;
    const labelEffectiveOffset = this.offset + this.strokeWidth / 2 + convertSize(10);

    // 计算边向量及长度
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const length = Math.hypot(dx, dy);

    // 计算外法线方向（根据多边形走向）
    const [nx, ny] = isCCW
      ? [dy / length, -dx / length] // CCW逆时针的法线方向
      : [-dy / length, dx / length]; // CW顺时针的法线方向

    // 计算平行偏移后的顶点坐标
    const offsetX = effectiveOffset * nx;
    const offsetY = effectiveOffset * ny;
    const A_prime = { x: A.x + offsetX, y: A.y + offsetY };
    const B_prime = { x: B.x + offsetX, y: B.y + offsetY };

    // 计算平行偏移后的顶点坐标
    const labelOffsetX = labelEffectiveOffset * nx;
    const labelOffsetY = labelEffectiveOffset * ny;
    const label_A_prime = { x: A.x + labelOffsetX, y: A.y + labelOffsetY };
    const label_B_prime = { x: B.x + labelOffsetX, y: B.y + labelOffsetY };

    // 计算标签参数
    const labelPoint = {
      x: (label_A_prime.x + label_B_prime.x) / 2,
      y: (label_A_prime.y + label_B_prime.y) / 2,
    };
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI; // 转换为度数

    const line = new Line();
    setLineStartEndPoint(line, new Point(A_prime), new Point(B_prime));

    const direction = getLineDirection(line);
    // 文字旋转
    const labelRotation: Record<string, number> = {
      top: 180,
      'top-right': 180,
      'top-left': 180,
      left: 180,
      'left-top': 180,
      'left-bottom': 180,
      bottom: 180,
      'bottom-left': 180,
    };

    return {
      line: [new Point(A_prime), new Point(B_prime)],
      label: {
        position: new Point(labelPoint),
        length,
        direction: getLineDirection(line),
        angle: angleDeg,
        labelAngle: labelRotation[direction] ?? 0,
      },
    };
  }

  /**
   * 生成线段两端的垂直标记线（用于标注起止位置）
   * @param {Point} start - 原始线段起点
   * @param {Point} end - 原始线段终点
   * @returns {Object} 包含两端垂直线的对象
   * @private
   */
  private getPerpendicularLines(
    start: Point,
    end: Point,
  ): { startLine: [Point, Point]; endLine: [Point, Point] } {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);

    if (length === 0) {
      // 处理零长度线段
      return {
        startLine: [new Point(start), new Point(start)],
        endLine: [new Point(end), new Point(end)],
      };
    }

    // 计算垂直于线段方向的单位向量
    const nx = -dy / length;
    const ny = dx / length;
    const halfLen = convertSize(6); // 垂线半长

    // 生成起终点垂线坐标
    return {
      startLine: [
        new Point(start.x - nx * halfLen, start.y - ny * halfLen),
        new Point(start.x + nx * halfLen, start.y + ny * halfLen),
      ],
      endLine: [
        new Point(end.x - nx * halfLen, end.y - ny * halfLen),
        new Point(end.x + nx * halfLen, end.y + ny * halfLen),
      ],
    };
  }

  /**
   * 可视化标注信息
   * @param {Annotations} annotations - 标注信息
   * @private
   */
  private renderAnnotations(annotations: Annotations) {
    annotations.lines.forEach((line) => {
      // 获取当前偏移线的垂直标记
      const { startLine, endLine } = this.getPerpendicularLines(line[0], line[line.length - 1]);

      // 绘制三条线条：偏移线 + 两端的垂直标记
      [line, startLine, endLine].forEach((points) => {
        const ui = new Line({
          points,
          strokeWidth: convertSize(2),
          stroke: 'rgb(153,153,153)',
          visible: this.showLine,
        });
        this.app.tree.add(ui);
        this.uiData.push(ui);
      });
    });

    // 创建边长标签
    annotations.labels.forEach((label) => {
      const textContent = `${label.length.toFixed(0)}`; // 取整显示

      const ui = new Box({
        x: label.position.x,
        y: label.position.y,
        width: convertSize(50), // 文本框宽度与边长一致
        height: convertSize(24), // 固定高度
        rotation: label.angle, // 文本旋转角度
        around: 'center',
        children: [
          {
            tag: 'Text',
            text: textContent,
            height: convertSize(24), // 固定高度
            width: convertSize(50),
            rotation: label.labelAngle,
            origin: 'center',
            fontSize: convertSize(12),
            fill: 'rgb(0,0,0)', // 黑色字体
            textAlign: 'center', // 居中显示
            verticalAlign: 'middle',
            visible: this.showLabel,
          },
        ],
      });

      this.app.tree.add(ui);
      this.uiData.push(ui);
    });
  }

  /**
   * 清除所有标注
   */
  remove() {
    this.uiData.forEach((ui) => ui.remove());
    this.uiData = [];
  }
}

export { EdgeAnnotations };
