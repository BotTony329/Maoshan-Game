import { describe, expect, it } from 'vitest';
import { SpatialGrid } from '../src/core/spatial-grid';

interface Node {
  x: number;
  y: number;
  id: string;
}

describe('SpatialGrid', () => {
  it('查询圆内命中的元素、排除圆外元素', () => {
    const grid = new SpatialGrid<Node>(100);
    const a: Node = { x: 0, y: 0, id: 'a' };
    const b: Node = { x: 50, y: 0, id: 'b' };
    const c: Node = { x: 300, y: 300, id: 'c' };
    grid.insert(a);
    grid.insert(b);
    grid.insert(c);

    const out: Node[] = [];
    grid.queryCircle(0, 0, 60, out);
    expect(out.map((n) => n.id).sort()).toEqual(['a', 'b']);
  });

  it('边界恰好相切的元素也被命中', () => {
    const grid = new SpatialGrid<Node>(100);
    grid.insert({ x: 100, y: 0, id: 'edge' });
    const out: Node[] = [];
    grid.queryCircle(0, 0, 100, out);
    expect(out).toHaveLength(1);
  });

  it('负坐标不串桶', () => {
    const grid = new SpatialGrid<Node>(100);
    const neg: Node = { x: -150, y: -150, id: 'neg' };
    const pos: Node = { x: 150, y: 150, id: 'pos' };
    grid.insert(neg);
    grid.insert(pos);

    const out: Node[] = [];
    grid.queryCircle(-150, -150, 10, out);
    expect(out.map((n) => n.id)).toEqual(['neg']);
  });

  it('clear 后不再返回旧元素', () => {
    const grid = new SpatialGrid<Node>(100);
    grid.insert({ x: 10, y: 10, id: 'old' });
    grid.clear();
    const out: Node[] = [];
    grid.queryCircle(10, 10, 50, out);
    expect(out).toHaveLength(0);
  });
});
