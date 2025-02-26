import { Bounds, Line, Point } from 'leafer-editor';
import { round } from 'lodash-es';
import { DEFAULT_ZOOM_SCALE } from '../constants';

/**
 * 获取矩形的中心
 * @param {Bounds} bounds - 矩形边界
 * @returns {Point} 中心点
 */
export const getBoundsCenter = (bounds: Bounds) => {
  return new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
};

/**
 * 计算弧线的点
 * @param {Point} start - 起点
 * @param {Point} end - 终点
 * @param {number} [numPoints=5] - 点的数量
 * @param {number} [curvature=0.5] - 曲率
 * @returns {Point[]} 弧线上的点
 */
export const lineArc = (start: Point, end: Point, numPoints = 5, curvature = 0.5) => {
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

/**
 * 获取线段的方向
 * @param {Line} line - 线段
 * @returns {string} 方向
 */
export const getLineDirection = (line: Line) => {
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

/**
 * 获取线段的起终点坐标
 * @param {Line} line - 线段
 * @returns {Point[]} 起终点坐标
 */
export const getLinePoints = (line: Line) => {
  if (line.points?.length) return line.points as Point[];
  const x1 = line.getComputedAttr('x') ?? 0;
  const y1 = line.getComputedAttr('y') ?? 0;

  return [new Point(x1, y1), getLineEndPoint(line)];
};

/**
 * 获取线段的终点坐标
 * @param {Line} line - 线段
 * @returns {Point} 终点坐标
 */
export const getLineEndPoint = (line: Line) => {
  const x1 = line.getComputedAttr('x') ?? 0;
  const y1 = line.getComputedAttr('y') ?? 0;
  const rotation = line.getComputedAttr('rotation') ?? 0;
  const width = line.getComputedAttr('width') ?? 0;

  const radians = (rotation * Math.PI) / 180;
  const x2 = x1 + width * Math.cos(radians);
  const y2 = y1 + width * Math.sin(radians);
  return new Point(round(x2), round(y2));
};

/**
 * 设置线段的起终点
 * @param {Line} line - 线段
 * @param {Point} start - 起点
 * @param {Point} end - 终点
 */
export const setLineStartEndPoint = (line: Line, start: Point, end: Point) => {
  line.set({
    x: start.x,
    y: start.y,
    toPoint: {
      x: end.x - start.x,
      y: end.y - start.y,
    },
  });
};

/**
 * 计算两条线段之间的夹角
 * @param {Line} line1 - 第一条线段
 * @param {Line} line2 - 第二条线段
 * @returns {number} 夹角
 */
export const getAngleBetweenLines = (line1: Line, line2: Line) => {
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

/**
 * 尺寸转换
 * @param {number} length - 长度
 * @returns {number} 转换后的长度
 */
export const convertSize = (length: number) => {
  return length / DEFAULT_ZOOM_SCALE;
};

/**
 * 获取多边形的质心
 * @param {Point[]} points - 多边形顶点
 * @returns {Point} 质心
 */
export const getPolygonCentroid = (points: Point[]): Point => {
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    area += cross;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
  }

  area /= 2; // 多边形的带符号面积
  const factor = 1 / (6 * area);

  return new Point({
    x: cx * factor,
    y: cy * factor,
  });
};

/**
 * 根据给定的线段起点与终点，在保持中心点和方向不变的情况下，调整线段长度
 * @param {Line} line - 线段
 * @param {number} newLength - 新的线段长度
 * @returns {Point[]} 调整后新的起点与终点坐标
 */
export const adjustLineFromCenter = (line: Line, newLength: number): Point[] => {
  const [start, end] = getLinePoints(line);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // 原始线段长度
  const oldLength = Math.hypot(dx, dy);

  // 线段长度为0时，直接在中心点前后平分
  if (oldLength === 0) {
    const half = newLength / 2;
    return [
      new Point({ x: round(start.x - half), y: round(start.y) }),
      new Point({ x: round(start.x + half), y: round(start.y) }),
    ];
  }

  // 中心点
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  // 方向向量
  const ux = dx / oldLength;
  const uy = dy / oldLength;

  // 新线段一半长度
  const halfLen = newLength / 2;

  // 计算新的起点与终点
  const newStart = {
    x: round(midX - ux * halfLen),
    y: round(midY - uy * halfLen),
  };
  const newEnd = {
    x: round(midX + ux * halfLen),
    y: round(midY + uy * halfLen),
  };

  return [new Point(newStart), new Point(newEnd)];
};
