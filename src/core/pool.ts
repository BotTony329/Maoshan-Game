/**
 * 对象池 —— 敌人 / 弹幕 / 拾取物高频生灭，全部走池化避免 GC 卡顿。
 * 归还的对象保持字段完整（由各系统负责 reset），这里只管借还。
 */
export class Pool<T> {
  private readonly freeList: T[] = [];

  constructor(
    private readonly create: () => T,
    prewarm = 0,
  ) {
    for (let i = 0; i < prewarm; i++) this.freeList.push(create());
  }

  obtain(): T {
    return this.freeList.pop() ?? this.create();
  }

  release(item: T): void {
    this.freeList.push(item);
  }
}
