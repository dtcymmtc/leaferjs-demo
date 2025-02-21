import { Box, Line, Point, UI } from 'leafer-editor';
import { DEFAULT_BOTTOM_LINE_WIDTH } from '../constants';
import { BasicDraw, type BasicDrawOptions } from './basic-draw';

/**
 * 标注标签的位置参数
 * @property position - 标签中心坐标
 * @property angle - 标签旋转角度（度）
 * @property length - 对应边的实际长度（像素）
 */
type AnnotationLabel = { position: Point; angle: number; length: number };

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
  private readonly offset = 6;
  /** 原始边线宽度，用于计算有效偏移量 */
  private readonly strokeWidth = DEFAULT_BOTTOM_LINE_WIDTH;

  private uiData: UI[] = [];

  constructor(options: EdgeAnnotationsOptions) {
    super(options);
    const result = this.generateEdgeAnnotations(options.points);
    this.renderAnnotations(result);
  }

  /**
   * 计算多边形带符号面积（用于判断多边形走向）
   * @param vertices - 多边形顶点数组
   * @returns 面积的2倍（符号指示方向）
   * ▷ 正值表示逆时针（CCW），负值表示顺时针（CW）
   */
  calculateAreaSign(vertices: Point[]): number {
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
  generateEdgeAnnotations(vertices: Point[]): Annotations {
    const area = this.calculateAreaSign(vertices);
    const isCCW = area > 0; // 逆时针标志

    const annotations: Annotations = { lines: [], labels: [] };
    const effectiveOffset = this.offset + this.strokeWidth / 2; // 总偏移量（含线宽补偿）

    for (let i = 0; i < vertices.length; i++) {
      const A = vertices[i];
      const B = vertices[(i + 1) % vertices.length];

      // 计算边向量及长度
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const length = Math.hypot(dx, dy);
      if (length === 0) continue;

      // 计算外法线方向（根据多边形走向）
      const [nx, ny] = isCCW
        ? [dy / length, -dx / length] // CCW逆时针的法线方向
        : [-dy / length, dx / length]; // CW顺时针的法线方向

      // 计算平行偏移后的顶点坐标
      const offsetX = effectiveOffset * nx;
      const offsetY = effectiveOffset * ny;
      const A_prime = { x: A.x + offsetX, y: A.y + offsetY };
      const B_prime = { x: B.x + offsetX, y: B.y + offsetY };

      // 存储偏移边和新标签
      annotations.lines.push([new Point(A_prime), new Point(B_prime)]);

      // 计算标签参数
      const midPoint = {
        x: (A_prime.x + B_prime.x) / 2,
        y: (A_prime.y + B_prime.y) / 2,
      };
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = (angleRad * 180) / Math.PI; // 转换为度数

      annotations.labels.push({
        position: new Point(midPoint),
        length,
        angle: angleDeg,
      });
    }

    return annotations;
  }

  /**
   * 生成线段两端的垂直标记线（用于标注起止位置）
   * @param start - 原始线段起点
   * @param end - 原始线段终点
   * @returns 包含两端垂直线的对象
   * ▷ 每端垂线长度为12px（中心向两侧各延伸6px）
   */
  getPerpendicularLines(
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
    const halfLen = 6; // 垂线半长

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
      const { startLine, endLine } = this.getPerpendicularLines(line[0], line[1]);

      // 绘制三条线条：偏移线 + 两端的垂直标记
      [line, startLine, endLine].forEach((points) => {
        const ui = new Line({
          points,
          strokeWidth: 2,
          stroke: 'rgb(153,153,153)',
        });
        this.app.tree.add(ui);
        this.uiData.push(ui);
      });
    });

    // 创建边长标签
    annotations.labels.forEach((label, index) => {
      const [start] = annotations.lines[index];
      const textContent = label.length.toFixed(0); // 取整显示

      const ui = new Box({
        x: start.x,
        y: start.y,
        width: label.length, // 文本框宽度与边长一致
        // fill: 'rgba(0,0,0,0.4)', // 半透明背景
        rotation: label.angle, // 文本旋转角度
        // origin: 'center',
        children: [
          {
            tag: 'Text',
            text: textContent,
            width: label.length,
            // rotation: label.angle,
            // origin: 'center',
            fontSize: 12,
            fill: 'rgb(0,0,0)', // 黑色字体
            textAlign: 'center', // 居中显示
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
