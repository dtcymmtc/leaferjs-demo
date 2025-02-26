import { Box, Line, Point, UI } from 'leafer-editor';
import { BasicDraw, type BasicDrawOptions } from '../basic/basic-draw';
import { DEFAULT_BOTTOM_LINE_WIDTH } from '../constants';
import { convertSize, getLineDirection, setLineStartEndPoint } from '../helper';

/**
 * 标注标签的位置参数
 * @property position - 标签中心坐标
 * @property angle - 标签旋转角度（度）
 * @property length - 对应边的实际长度（像素）
 */
type AnnotationLabel = {
  position: Point;
  angle: number;
  length: number;
  direction: string;
  labelAngle: number;
};

/**
 * 边标注数据结构
 * @property lines - 偏移后的辅助线集合（每条边对应一条偏移线）
 * @property labels - 边长标签集合
 */
type Annotations = {
  lines: Point[][];
  labels: AnnotationLabel[];
};

interface EdgeAnnotationsOptions extends BasicDrawOptions {
  points: Point[];
  type: 'polygon' | 'line' | 'arc';
  showLabel?: boolean;
  showLine?: boolean;
}

/**
 * 边标注工具类，用于在图形边线外侧生成尺寸标注
 * ▷ 功能特点：
 * - 自动处理多边形方向（顺时针/逆时针）
 * - 自动计算外法线方向偏移
 * - 生成带旋转角度的长度标签
 * - 在原始线段两端绘制垂直标记线
 */
class EdgeAnnotations extends BasicDraw {
  /** 标注线距离原始边线的偏移距离（像素） */
  private readonly offset = convertSize(6);
  /** 原始边线宽度，用于计算有效偏移量 */
  private readonly strokeWidth = convertSize(DEFAULT_BOTTOM_LINE_WIDTH);

  private uiData: UI[] = [];

  private showLabel: boolean;

  private showLine: boolean;

  annotations: Annotations = { lines: [], labels: [] };

  constructor(options: EdgeAnnotationsOptions) {
    super(options);

    this.showLabel = options.showLabel ?? true;
    this.showLine = options.showLine ?? true;

    if (options.type === 'polygon') {
      this.annotations = this.generatePolygonAnnotations(options.points);
      this.renderAnnotations(this.annotations);
    } else if (options.type === 'line') {
      this.annotations = this.generateLineAnnotations(options.points);
      this.renderAnnotations(this.annotations);
    } else if (options.type === 'arc') {
      this.annotations = this.generateArcAnnotations(options.points);
      this.renderAnnotations(this.annotations);
    }
  }

  /**
   * 计算多边形带符号面积（用于判断多边形走向）
   * @param vertices - 多边形顶点数组
   * @returns 面积的2倍（符号指示方向）
   * ▷ 正值表示逆时针（CCW），负值表示顺时针（CW）
   */
  private calculateAreaSign(vertices: Point[]): number {
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    }
    return area;
  }

  /**
   * 生成边线标注信息
   * @param vertices - 多边形顶点数组（有序排列）
   * @returns 包含偏移线和标签数据的标注信息
   * ▷ 计算逻辑：
   * 1. 判断多边形方向（CCW/CW）
   * 2. 沿各边外法线方向生成平行偏移线
   * 3. 计算每条边对应的中点标签位置和旋转角度
   */
  private generatePolygonAnnotations(vertices: Point[]): Annotations {
    const area = this.calculateAreaSign(vertices);
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

  private generateLineAnnotations(vertices: Point[]): Annotations {
    const result = this.generateAnnotations(vertices[0], vertices[1], false);

    return {
      lines: [result.line],
      labels: [result.label],
    };
  }

  /**
   * 新增：生成弧线标注信息
   * @param arcPoints - 构成弧线的离散点
   * @returns 完整的标注信息，包含若干个分段偏移线 + 一个整体长度标签
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

  private generateAnnotations(A: Point, B: Point, isCCW: boolean) {
    const effectiveOffset = this.offset + this.strokeWidth / 2;

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

    // 计算标签参数
    const midPoint = {
      x: (A_prime.x + B_prime.x) / 2,
      y: (A_prime.y + B_prime.y) / 2,
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
        position: new Point(midPoint),
        length,
        direction: getLineDirection(line),
        angle: angleDeg,
        labelAngle: labelRotation[direction] ?? 0,
      },
    };
  }

  /**
   * 生成线段两端的垂直标记线（用于标注起止位置）
   * @param start - 原始线段起点
   * @param end - 原始线段终点
   * @returns 包含两端垂直线的对象
   * ▷ 每端垂线长度为12px（中心向两侧各延伸6px）
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
   * ▷ 渲染流程：
   * 1. 绘制所有平行偏移线
   * 2. 在原始线段两端绘制垂直标记
   * 3. 创建带旋转角度的长度标签
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
          stroke: 'rgb(89,89,89)',
          visible: this.showLine,
        });
        this.app.tree.add(ui);
        this.uiData.push(ui);
      });
    });

    // 创建边长标签
    annotations.labels.forEach((label, index) => {
      const [start] = annotations.lines[index];
      const textContent = `${label.length.toFixed(0)}`; // 取整显示

      const ui = new Box({
        x: start.x,
        y: start.y,
        width: label.length, // 文本框宽度与边长一致
        height: convertSize(24), // 固定高度
        rotation: label.angle, // 文本旋转角度
        children: [
          {
            tag: 'Text',
            text: textContent,
            height: convertSize(24), // 固定高度
            width: label.length,
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

  clear() {
    this.uiData.forEach((ui) => ui.remove());
    this.uiData = [];
  }
}

export { EdgeAnnotations };
