/**
 * RoboViz Ring Buffer Implementation
 *
 * 高性能环形缓冲区，用于实时数据流缓存
 */

import type { RingBuffer, RingBufferConfig } from './types';

/**
 * 通用环形缓冲区实现
 */
export class GenericRingBuffer<T> implements RingBuffer<T> {
  private readonly buffer: (T | undefined)[];
  private head: number = 0;  // 下一个写入位置
  private tail: number = 0;  // 下一个读取位置
  private count: number = 0;
  private readonly overflowPolicy: RingBufferConfig['overflowPolicy'];

  constructor(capacity: number, overflowPolicy: RingBufferConfig['overflowPolicy'] = 'drop_oldest') {
    if (capacity <= 0) {
      throw new Error('Ring buffer capacity must be positive');
    }
    this.buffer = new Array(capacity);
    this.overflowPolicy = overflowPolicy;
  }

  get size(): number {
    return this.count;
  }

  get capacity(): number {
    return this.buffer.length;
  }

  get isEmpty(): boolean {
    return this.count === 0;
  }

  get isFull(): boolean {
    return this.count === this.buffer.length;
  }

  /**
   * 推入数据
   * @returns true 如果成功，false 如果因策略而丢弃
   */
  push(data: T): boolean {
    if (this.isFull) {
      switch (this.overflowPolicy) {
        case 'drop_oldest':
          // 丢弃最旧的数据，腾出空间
          this.tail = (this.tail + 1) % this.buffer.length;
          this.count--;
          break;
        case 'drop_newest':
          // 丢弃新数据
          return false;
        case 'block':
          // 阻塞模式下直接返回 false，由调用者处理
          return false;
      }
    }

    this.buffer[this.head] = data;
    this.head = (this.head + 1) % this.buffer.length;
    this.count++;
    return true;
  }

  /**
   * 弹出最旧的数据
   */
  pop(): T | undefined {
    if (this.isEmpty) {
      return undefined;
    }

    const data = this.buffer[this.tail];
    this.buffer[this.tail] = undefined;  // 帮助 GC
    this.tail = (this.tail + 1) % this.buffer.length;
    this.count--;
    return data;
  }

  /**
   * 查看最新的数据（不移除）
   */
  peek(): T | undefined {
    if (this.isEmpty) {
      return undefined;
    }
    // head 指向下一个写入位置，所以最新数据在 head - 1
    const index = (this.head - 1 + this.buffer.length) % this.buffer.length;
    return this.buffer[index];
  }

  /**
   * 查看最旧的数据（不移除）
   */
  peekOldest(): T | undefined {
    if (this.isEmpty) {
      return undefined;
    }
    return this.buffer[this.tail];
  }

  /**
   * 获取所有数据（按时间顺序，从旧到新）
   */
  toArray(): T[] {
    if (this.isEmpty) {
      return [];
    }

    const result: T[] = [];
    let index = this.tail;
    for (let i = 0; i < this.count; i++) {
      result.push(this.buffer[index]!);
      index = (index + 1) % this.buffer.length;
    }
    return result;
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    for (let i = 0; i < this.buffer.length; i++) {
      this.buffer[i] = undefined;
    }
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * 迭代器支持
   */
  *[Symbol.iterator](): Iterator<T> {
    if (this.isEmpty) {
      return;
    }

    let index = this.tail;
    for (let i = 0; i < this.count; i++) {
      yield this.buffer[index]!;
      index = (index + 1) % this.buffer.length;
    }
  }
}

/**
 * 时间戳索引的环形缓冲区
 *
 * 专门用于时间序列数据，支持按时间查询
 */
export interface TimestampedData<T> {
  timestamp: number;
  data: T;
}

export class TimestampedRingBuffer<T> extends GenericRingBuffer<TimestampedData<T>> {
  /**
   * 查找指定时间戳之后的所有数据
   */
  getAfter(timestamp: number): T[] {
    const result: T[] = [];
    for (const item of this) {
      if (item.timestamp > timestamp) {
        result.push(item.data);
      }
    }
    return result;
  }

  /**
   * 查找指定时间戳之前的所有数据
   */
  getBefore(timestamp: number): T[] {
    const result: T[] = [];
    for (const item of this) {
      if (item.timestamp < timestamp) {
        result.push(item.data);
      }
    }
    return result;
  }

  /**
   * 查找时间范围内的数据
   */
  getRange(startTime: number, endTime: number): T[] {
    const result: T[] = [];
    for (const item of this) {
      if (item.timestamp >= startTime && item.timestamp <= endTime) {
        result.push(item.data);
      }
    }
    return result;
  }

  /**
   * 查找最接近指定时间戳的数据
   */
  getNearest(timestamp: number): T | undefined {
    if (this.isEmpty) {
      return undefined;
    }

    let nearest: TimestampedData<T> | undefined;
    let minDiff = Infinity;

    for (const item of this) {
      const diff = Math.abs(item.timestamp - timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = item;
      }
    }

    return nearest?.data;
  }

  /**
   * 获取时间范围
   */
  getTimeRange(): { start: number; end: number } | undefined {
    const oldest = this.peekOldest();
    const newest = this.peek();

    if (!oldest || !newest) {
      return undefined;
    }

    return {
      start: oldest.timestamp,
      end: newest.timestamp,
    };
  }
}

/**
 * 无锁环形缓冲区 (使用 SharedArrayBuffer)
 *
 * 用于 Web Worker 之间的高性能数据传输
 * 注意: 需要 SharedArrayBuffer 支持 (COOP/COEP headers)
 */
export class SharedRingBuffer {
  private readonly buffer: SharedArrayBuffer;
  private readonly view: DataView;
  private readonly atomicHead: Int32Array;
  private readonly atomicTail: Int32Array;
  private readonly elementSize: number;
  private readonly capacity: number;

  // Header layout:
  // [0-3]: head index (atomic)
  // [4-7]: tail index (atomic)
  // [8-11]: capacity
  // [12-15]: element size
  // [16+]: data

  private static readonly HEADER_SIZE = 16;

  constructor(capacity: number, elementSize: number) {
    this.capacity = capacity;
    this.elementSize = elementSize;

    const dataSize = capacity * elementSize;
    const totalSize = SharedRingBuffer.HEADER_SIZE + dataSize;

    this.buffer = new SharedArrayBuffer(totalSize);
    this.view = new DataView(this.buffer);

    // 原子操作数组
    this.atomicHead = new Int32Array(this.buffer, 0, 1);
    this.atomicTail = new Int32Array(this.buffer, 4, 1);

    // 初始化 header
    this.view.setInt32(8, capacity, true);
    this.view.setInt32(12, elementSize, true);
  }

  /**
   * 从现有 SharedArrayBuffer 创建 (用于 Worker 端)
   */
  static fromBuffer(buffer: SharedArrayBuffer): SharedRingBuffer {
    const view = new DataView(buffer);
    const capacity = view.getInt32(8, true);
    const elementSize = view.getInt32(12, true);

    const instance = Object.create(SharedRingBuffer.prototype);
    instance.buffer = buffer;
    instance.view = view;
    instance.atomicHead = new Int32Array(buffer, 0, 1);
    instance.atomicTail = new Int32Array(buffer, 4, 1);
    instance.capacity = capacity;
    instance.elementSize = elementSize;

    return instance;
  }

  /**
   * 获取底层 buffer (用于传递给 Worker)
   */
  getBuffer(): SharedArrayBuffer {
    return this.buffer;
  }

  /**
   * 推入数据 (线程安全)
   */
  push(data: ArrayBuffer): boolean {
    if (data.byteLength !== this.elementSize) {
      throw new Error(`Data size mismatch: expected ${this.elementSize}, got ${data.byteLength}`);
    }

    // 获取当前 head
    const head = Atomics.load(this.atomicHead, 0);
    const tail = Atomics.load(this.atomicTail, 0);

    // 计算下一个 head
    const nextHead = (head + 1) % this.capacity;

    // 检查是否满
    if (nextHead === tail) {
      return false;  // 满了
    }

    // 写入数据
    const offset = SharedRingBuffer.HEADER_SIZE + head * this.elementSize;
    const source = new Uint8Array(data);
    const target = new Uint8Array(this.buffer, offset, this.elementSize);
    target.set(source);

    // 更新 head (原子操作)
    Atomics.store(this.atomicHead, 0, nextHead);

    return true;
  }

  /**
   * 弹出数据 (线程安全)
   */
  pop(): ArrayBuffer | undefined {
    const head = Atomics.load(this.atomicHead, 0);
    const tail = Atomics.load(this.atomicTail, 0);

    // 检查是否空
    if (head === tail) {
      return undefined;
    }

    // 读取数据
    const offset = SharedRingBuffer.HEADER_SIZE + tail * this.elementSize;
    const source = new Uint8Array(this.buffer, offset, this.elementSize);
    const result = new ArrayBuffer(this.elementSize);
    new Uint8Array(result).set(source);

    // 更新 tail (原子操作)
    const nextTail = (tail + 1) % this.capacity;
    Atomics.store(this.atomicTail, 0, nextTail);

    return result;
  }

  /**
   * 获取当前大小
   */
  get size(): number {
    const head = Atomics.load(this.atomicHead, 0);
    const tail = Atomics.load(this.atomicTail, 0);
    return (head - tail + this.capacity) % this.capacity;
  }

  /**
   * 检查是否为空
   */
  get isEmpty(): boolean {
    return Atomics.load(this.atomicHead, 0) === Atomics.load(this.atomicTail, 0);
  }

  /**
   * 检查是否已满
   */
  get isFull(): boolean {
    const head = Atomics.load(this.atomicHead, 0);
    const tail = Atomics.load(this.atomicTail, 0);
    return (head + 1) % this.capacity === tail;
  }
}
