import { Point, Segment } from '@flatten-js/core';
import { Line as LLine, Point as LPoint } from 'leafer-editor';
import { round } from 'lodash-es';
import { getLineEndPoint } from './common';

/** 获取两条直线的交点 */
export function getIntersection(line1: LLine, line2: LLine) {
  const s1 = new Segment(
    new Point(line1.x, line1.y),
    new Point(getLineEndPoint(line1).x, getLineEndPoint(line1).y),
  );
  const s2 = new Segment(
    new Point(line2.x, line2.y),
    new Point(getLineEndPoint(line2).x, getLineEndPoint(line2).y),
  );
  const points = s1.intersect(s2);

  return points.map((point) => new LPoint(round(point.x), round(point.y)));
}
