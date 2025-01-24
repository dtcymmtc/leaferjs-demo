import { Bounds, Line, Point } from 'leafer-editor';
import { round } from 'lodash-es';

/** 获取矩形的中心 */
export const getBoundsCenter = (bounds: Bounds) => {
  return new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
};

/** 计算弧线的点 */
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

/** 获取线段的方向 */
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

/** 获取线段的终点坐标 */
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

/** 计算两条线段之间的夹角 */
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
