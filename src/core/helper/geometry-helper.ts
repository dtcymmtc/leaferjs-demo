import { Point, type Line } from 'leafer-editor';
import { round } from 'lodash-es';
import { getLinePoints } from './common';

function checkIntersection(line1: Line, line2: Line): Point[] {
  // 解构线段坐标
  const [p1, p2] = getLinePoints(line1);
  const [p3, p4] = getLinePoints(line2);

  // 计算方向向量
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  // 计算叉积
  function direction(pi: Point, pj: Point, pk: Point): number {
    return (pk.x - pi.x) * (pj.y - pi.y) - (pj.x - pi.x) * (pk.y - pi.y);
  }

  // 检查是否在矩形范围内
  function onSegment(pi: Point, pj: Point, pk: Point): boolean {
    const minX = Math.min(pi.x, pj.x);
    const maxX = Math.max(pi.x, pj.x);
    const minY = Math.min(pi.y, pj.y);
    const maxY = Math.max(pi.y, pj.y);
    return pk.x >= minX && pk.x <= maxX && pk.y >= minY && pk.y <= maxY;
  }

  // 判断是否相交
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    // 计算交点
    const t = d1 / (d1 - d2);
    const x = p1.x + t * (p2.x - p1.x);
    const y = p1.y + t * (p2.y - p1.y);
    return [new Point(x, y)];
  }

  // 检查是否共线
  if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0) {
    // 检查是否重叠
    const line1MinX = Math.min(p1.x, p2.x);
    const line1MaxX = Math.max(p1.x, p2.x);
    const line2MinX = Math.min(p3.x, p4.x);
    const line2MaxX = Math.max(p3.x, p4.x);

    const line1MinY = Math.min(p1.y, p2.y);
    const line1MaxY = Math.max(p1.y, p2.y);
    const line2MinY = Math.min(p3.y, p4.y);
    const line2MaxY = Math.max(p3.y, p4.y);

    // 检查X和Y投影是否有重叠
    if (
      line1MaxX >= line2MinX &&
      line2MaxX >= line1MinX &&
      line1MaxY >= line2MinY &&
      line2MaxY >= line1MinY
    ) {
      // 计算重叠部分的起点和终点
      const points: Point[] = [];

      // 检查线段1的端点是否在线段2上
      if (onSegment(p3, p4, p1)) points.push(p1);
      if (onSegment(p3, p4, p2)) points.push(p2);

      // 检查线段2的端点是否在线段1上
      if (onSegment(p1, p2, p3)) points.push(p3);
      if (onSegment(p1, p2, p4)) points.push(p4);

      // 如果有两个点，则形成重叠线段
      if (points.length >= 2) {
        // 按x坐标排序，如果x相同则按y排序
        points.sort((a, b) => a.x - b.x || a.y - b.y);
        // 循环过滤重复的点
        for (let i = 1; i < points.length; i++) {
          if (points[i].x === points[i - 1].x && points[i].y === points[i - 1].y) {
            points.splice(i, 1);
            i--;
          }
        }

        return points;
      }
    }
  }

  // 检查端点是否在另一条线段上
  if (d1 === 0 && onSegment(p3, p4, p1)) {
    return [p1];
  }
  if (d2 === 0 && onSegment(p3, p4, p2)) {
    return [p2];
  }
  if (d3 === 0 && onSegment(p1, p2, p3)) {
    return [p3];
  }
  if (d4 === 0 && onSegment(p1, p2, p4)) {
    return [p4];
  }

  // 不相交
  return [];
}

/**
 * 获取两条直线的交点
 * @param {LLine} line1 - 第一条直线
 * @param {LLine} line2 - 第二条直线
 * @returns {LPoint[]} 交点数组
 */
export function getIntersection(line1: Line, line2: Line): Point[] {
  return checkIntersection(line1, line2).map((point) => new Point(round(point.x), round(point.y)));
}
