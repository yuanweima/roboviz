/**
 * RoboViz Binary Protocol
 *
 * 高性能二进制消息协议，用于实时数据传输
 *
 * Header Format (20 bytes):
 * ┌─────────────────────────────────────────────────────────┐
 * │ Magic (4B) │ Ver (1B) │ Type (1B) │ StreamID (2B) │ ... │
 * │ ... Timestamp (8B) │ PayloadLen (4B)                    │
 * └─────────────────────────────────────────────────────────┘
 *
 * Magic Number: 0x52564953 ("RVIS" in ASCII)
 */

import type {
  JointStateFrame,
  TcpPoseFrame,
  ForceTorqueFrame,
  PointCloudFrame,
  IOStateFrame,
  StreamFrame,
} from './types';

// ============================================================================
// Constants
// ============================================================================

/** 魔数 "RVIS" */
export const BINARY_MAGIC = 0x52564953;

/** 协议版本 */
export const PROTOCOL_VERSION = 1;

/** 头部大小 */
export const HEADER_SIZE = 20;

/**
 * 消息类型枚举
 */
export enum BinaryMessageType {
  // 数据帧类型 (0x01 - 0x0F)
  JOINT_STATE = 0x01,
  TCP_POSE = 0x02,
  POINT_CLOUD = 0x03,
  FORCE_TORQUE = 0x04,
  IO_STATE = 0x05,
  SENSOR_DATA = 0x06,

  // 控制帧类型 (0x10 - 0x1F)
  STREAM_CREATE = 0x10,
  STREAM_DESTROY = 0x11,
  STREAM_PAUSE = 0x12,
  STREAM_RESUME = 0x13,
  STREAM_STATUS = 0x14,

  // 应答帧类型 (0x20 - 0x2F)
  ACK = 0x20,
  NACK = 0x21,

  // 心跳 (0xF0 - 0xFF)
  HEARTBEAT = 0xF0,
  HEARTBEAT_ACK = 0xF1,
}

// ============================================================================
// Error Types
// ============================================================================

export class BinaryProtocolError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'BinaryProtocolError';
  }
}

/**
 * 二进制消息头类型
 */
export interface BinaryHeader {
  magic: number;
  version: number;
  type: BinaryMessageType;
  streamId: number;
  timestamp: number;
  payloadLength: number;
}

// ============================================================================
// Binary Protocol Implementation
// ============================================================================

/**
 * 二进制协议编解码器
 */
export class BinaryProtocol {
  private readonly textEncoder = new TextEncoder();
  private readonly textDecoder = new TextDecoder();

  // ==========================================================================
  // Header Operations
  // ==========================================================================

  /**
   * 编码消息头
   */
  encodeHeader(
    buffer: ArrayBuffer,
    offset: number,
    type: BinaryMessageType,
    streamId: number,
    timestamp: number,
    payloadLength: number
  ): void {
    const view = new DataView(buffer, offset);

    // Magic Number (4 bytes, big endian)
    view.setUint32(0, BINARY_MAGIC, false);

    // Version (1 byte)
    view.setUint8(4, PROTOCOL_VERSION);

    // Message Type (1 byte)
    view.setUint8(5, type);

    // Stream ID (2 bytes, big endian)
    view.setUint16(6, streamId, false);

    // Timestamp (8 bytes, big endian)
    view.setBigUint64(8, BigInt(timestamp), false);

    // Payload Length (4 bytes, big endian)
    view.setUint32(16, payloadLength, false);
  }

  /**
   * 解码消息头
   */
  decodeHeader(buffer: ArrayBuffer, offset: number = 0): BinaryHeader {
    const view = new DataView(buffer, offset);

    const magic = view.getUint32(0, false);
    if (magic !== BINARY_MAGIC) {
      throw new BinaryProtocolError(
        `Invalid magic number: 0x${magic.toString(16)}`,
        'INVALID_MAGIC'
      );
    }

    const version = view.getUint8(4);
    if (version !== PROTOCOL_VERSION) {
      throw new BinaryProtocolError(
        `Unsupported protocol version: ${version}`,
        'UNSUPPORTED_VERSION'
      );
    }

    return {
      magic,
      version,
      type: view.getUint8(5) as BinaryMessageType,
      streamId: view.getUint16(6, false),
      timestamp: Number(view.getBigUint64(8, false)),
      payloadLength: view.getUint32(16, false),
    };
  }

  // ==========================================================================
  // Joint State Encoding/Decoding
  // ==========================================================================

  /**
   * 编码关节状态帧
   *
   * Payload Format:
   * ┌───────────────────────────────────────────────────────────────┐
   * │ SeqNum (4B) │ DOF (1B) │ Flags (1B) │ Positions (DOF * 8B) │ ... │
   * │ [Velocities] │ [Accelerations] │ [Torques] │ [Currents] │ [Temps] │
   * └───────────────────────────────────────────────────────────────┘
   *
   * Flags bits:
   * - bit 0: has velocities
   * - bit 1: has accelerations
   * - bit 2: has torques
   * - bit 3: has currents
   * - bit 4: has temperatures
   */
  encodeJointState(streamId: number, frame: JointStateFrame): ArrayBuffer {
    const dof = frame.positions.length;

    // 计算 flags 和 payload 大小
    let flags = 0;
    let optionalSize = 0;

    if (frame.velocities) {
      flags |= 0x01;
      optionalSize += dof * 8;
    }
    if (frame.accelerations) {
      flags |= 0x02;
      optionalSize += dof * 8;
    }
    if (frame.torques) {
      flags |= 0x04;
      optionalSize += dof * 8;
    }
    if (frame.currents) {
      flags |= 0x08;
      optionalSize += dof * 8;
    }
    if (frame.temperatures) {
      flags |= 0x10;
      optionalSize += dof * 8;
    }

    // Payload: SeqNum(4) + DOF(1) + Flags(1) + Positions(dof*8) + optional
    const payloadSize = 6 + dof * 8 + optionalSize;
    const totalSize = HEADER_SIZE + payloadSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // 编码头部
    this.encodeHeader(buffer, 0, BinaryMessageType.JOINT_STATE, streamId, frame.timestamp, payloadSize);

    // 编码 payload
    let offset = HEADER_SIZE;

    // Sequence Number (4 bytes)
    view.setUint32(offset, frame.sequenceNumber, false);
    offset += 4;

    // DOF (1 byte)
    view.setUint8(offset, dof);
    offset += 1;

    // Flags (1 byte)
    view.setUint8(offset, flags);
    offset += 1;

    // Positions
    for (let i = 0; i < dof; i++) {
      view.setFloat64(offset, frame.positions[i], false);
      offset += 8;
    }

    // Optional fields
    if (frame.velocities) {
      for (let i = 0; i < dof; i++) {
        view.setFloat64(offset, frame.velocities[i], false);
        offset += 8;
      }
    }
    if (frame.accelerations) {
      for (let i = 0; i < dof; i++) {
        view.setFloat64(offset, frame.accelerations[i], false);
        offset += 8;
      }
    }
    if (frame.torques) {
      for (let i = 0; i < dof; i++) {
        view.setFloat64(offset, frame.torques[i], false);
        offset += 8;
      }
    }
    if (frame.currents) {
      for (let i = 0; i < dof; i++) {
        view.setFloat64(offset, frame.currents[i], false);
        offset += 8;
      }
    }
    if (frame.temperatures) {
      for (let i = 0; i < dof; i++) {
        view.setFloat64(offset, frame.temperatures[i], false);
        offset += 8;
      }
    }

    return buffer;
  }

  /**
   * 解码关节状态帧
   */
  decodeJointState(buffer: ArrayBuffer): { streamId: number; frame: JointStateFrame } {
    const header = this.decodeHeader(buffer);
    const view = new DataView(buffer);

    let offset = HEADER_SIZE;

    // Sequence Number
    const sequenceNumber = view.getUint32(offset, false);
    offset += 4;

    // DOF
    const dof = view.getUint8(offset);
    offset += 1;

    // Flags
    const flags = view.getUint8(offset);
    offset += 1;

    // Positions
    const positions = new Float64Array(dof);
    for (let i = 0; i < dof; i++) {
      positions[i] = view.getFloat64(offset, false);
      offset += 8;
    }

    const frame: JointStateFrame = {
      timestamp: header.timestamp,
      sequenceNumber,
      positions,
    };

    // Optional fields
    if (flags & 0x01) {
      frame.velocities = new Float64Array(dof);
      for (let i = 0; i < dof; i++) {
        frame.velocities[i] = view.getFloat64(offset, false);
        offset += 8;
      }
    }
    if (flags & 0x02) {
      frame.accelerations = new Float64Array(dof);
      for (let i = 0; i < dof; i++) {
        frame.accelerations[i] = view.getFloat64(offset, false);
        offset += 8;
      }
    }
    if (flags & 0x04) {
      frame.torques = new Float64Array(dof);
      for (let i = 0; i < dof; i++) {
        frame.torques[i] = view.getFloat64(offset, false);
        offset += 8;
      }
    }
    if (flags & 0x08) {
      frame.currents = new Float64Array(dof);
      for (let i = 0; i < dof; i++) {
        frame.currents[i] = view.getFloat64(offset, false);
        offset += 8;
      }
    }
    if (flags & 0x10) {
      frame.temperatures = new Float64Array(dof);
      for (let i = 0; i < dof; i++) {
        frame.temperatures[i] = view.getFloat64(offset, false);
        offset += 8;
      }
    }

    return { streamId: header.streamId, frame };
  }

  // ==========================================================================
  // TCP Pose Encoding/Decoding
  // ==========================================================================

  /**
   * 编码 TCP 位姿帧
   *
   * Payload Format:
   * ┌────────────────────────────────────────────────────────────────────┐
   * │ SeqNum (4B) │ Flags (1B) │ Position (3*8B) │ Orientation (4*8B) │   │
   * │ [LinearVel (3*8B)] │ [AngularVel (3*8B)] │ [RefFrameLen] [RefFrame] │
   * └────────────────────────────────────────────────────────────────────┘
   *
   * Flags bits:
   * - bit 0: has linear velocity
   * - bit 1: has angular velocity
   * - bit 2: has reference frame
   */
  encodeTcpPose(streamId: number, frame: TcpPoseFrame): ArrayBuffer {
    let flags = 0;
    let optionalSize = 0;
    let refFrameBytes: Uint8Array | null = null;

    if (frame.linearVelocity) {
      flags |= 0x01;
      optionalSize += 24; // 3 * 8 bytes
    }
    if (frame.angularVelocity) {
      flags |= 0x02;
      optionalSize += 24;
    }
    if (frame.referenceFrameId) {
      flags |= 0x04;
      refFrameBytes = this.textEncoder.encode(frame.referenceFrameId);
      optionalSize += 2 + refFrameBytes.length; // length (2B) + string
    }

    // Payload: SeqNum(4) + Flags(1) + Pos(24) + Orient(32) + optional
    const payloadSize = 61 + optionalSize;
    const totalSize = HEADER_SIZE + payloadSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    // Header
    this.encodeHeader(buffer, 0, BinaryMessageType.TCP_POSE, streamId, frame.timestamp, payloadSize);

    let offset = HEADER_SIZE;

    // Sequence Number
    view.setUint32(offset, frame.sequenceNumber, false);
    offset += 4;

    // Flags
    view.setUint8(offset, flags);
    offset += 1;

    // Position (3 * float64)
    for (let i = 0; i < 3; i++) {
      view.setFloat64(offset, frame.position[i], false);
      offset += 8;
    }

    // Orientation (4 * float64, quaternion w,x,y,z)
    for (let i = 0; i < 4; i++) {
      view.setFloat64(offset, frame.orientation[i], false);
      offset += 8;
    }

    // Optional: Linear Velocity
    if (frame.linearVelocity) {
      for (let i = 0; i < 3; i++) {
        view.setFloat64(offset, frame.linearVelocity[i], false);
        offset += 8;
      }
    }

    // Optional: Angular Velocity
    if (frame.angularVelocity) {
      for (let i = 0; i < 3; i++) {
        view.setFloat64(offset, frame.angularVelocity[i], false);
        offset += 8;
      }
    }

    // Optional: Reference Frame ID
    if (refFrameBytes) {
      view.setUint16(offset, refFrameBytes.length, false);
      offset += 2;
      const byteView = new Uint8Array(buffer, offset, refFrameBytes.length);
      byteView.set(refFrameBytes);
    }

    return buffer;
  }

  /**
   * 解码 TCP 位姿帧
   */
  decodeTcpPose(buffer: ArrayBuffer): { streamId: number; frame: TcpPoseFrame } {
    const header = this.decodeHeader(buffer);
    const view = new DataView(buffer);

    let offset = HEADER_SIZE;

    // Sequence Number
    const sequenceNumber = view.getUint32(offset, false);
    offset += 4;

    // Flags
    const flags = view.getUint8(offset);
    offset += 1;

    // Position
    const position = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      position[i] = view.getFloat64(offset, false);
      offset += 8;
    }

    // Orientation
    const orientation = new Float64Array(4);
    for (let i = 0; i < 4; i++) {
      orientation[i] = view.getFloat64(offset, false);
      offset += 8;
    }

    const frame: TcpPoseFrame = {
      timestamp: header.timestamp,
      sequenceNumber,
      position,
      orientation,
    };

    // Optional: Linear Velocity
    if (flags & 0x01) {
      frame.linearVelocity = new Float64Array(3);
      for (let i = 0; i < 3; i++) {
        frame.linearVelocity[i] = view.getFloat64(offset, false);
        offset += 8;
      }
    }

    // Optional: Angular Velocity
    if (flags & 0x02) {
      frame.angularVelocity = new Float64Array(3);
      for (let i = 0; i < 3; i++) {
        frame.angularVelocity[i] = view.getFloat64(offset, false);
        offset += 8;
      }
    }

    // Optional: Reference Frame ID
    if (flags & 0x04) {
      const refFrameLen = view.getUint16(offset, false);
      offset += 2;
      const refFrameBytes = new Uint8Array(buffer, offset, refFrameLen);
      frame.referenceFrameId = this.textDecoder.decode(refFrameBytes);
    }

    return { streamId: header.streamId, frame };
  }

  // ==========================================================================
  // Force/Torque Encoding/Decoding
  // ==========================================================================

  /**
   * 编码力/力矩帧
   */
  encodeForceTorque(streamId: number, frame: ForceTorqueFrame): ArrayBuffer {
    let flags = 0;
    let optionalSize = 0;
    let frameIdBytes: Uint8Array | null = null;

    if (frame.sensorFrameId) {
      flags |= 0x01;
      frameIdBytes = this.textEncoder.encode(frame.sensorFrameId);
      optionalSize += 2 + frameIdBytes.length;
    }

    // Payload: SeqNum(4) + Flags(1) + Force(24) + Torque(24) + optional
    const payloadSize = 53 + optionalSize;
    const totalSize = HEADER_SIZE + payloadSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    this.encodeHeader(buffer, 0, BinaryMessageType.FORCE_TORQUE, streamId, frame.timestamp, payloadSize);

    let offset = HEADER_SIZE;

    view.setUint32(offset, frame.sequenceNumber, false);
    offset += 4;

    view.setUint8(offset, flags);
    offset += 1;

    // Force
    for (let i = 0; i < 3; i++) {
      view.setFloat64(offset, frame.force[i], false);
      offset += 8;
    }

    // Torque
    for (let i = 0; i < 3; i++) {
      view.setFloat64(offset, frame.torque[i], false);
      offset += 8;
    }

    // Optional: Sensor Frame ID
    if (frameIdBytes) {
      view.setUint16(offset, frameIdBytes.length, false);
      offset += 2;
      const byteView = new Uint8Array(buffer, offset, frameIdBytes.length);
      byteView.set(frameIdBytes);
    }

    return buffer;
  }

  /**
   * 解码力/力矩帧
   */
  decodeForceTorque(buffer: ArrayBuffer): { streamId: number; frame: ForceTorqueFrame } {
    const header = this.decodeHeader(buffer);
    const view = new DataView(buffer);

    let offset = HEADER_SIZE;

    const sequenceNumber = view.getUint32(offset, false);
    offset += 4;

    const flags = view.getUint8(offset);
    offset += 1;

    const force = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      force[i] = view.getFloat64(offset, false);
      offset += 8;
    }

    const torque = new Float64Array(3);
    for (let i = 0; i < 3; i++) {
      torque[i] = view.getFloat64(offset, false);
      offset += 8;
    }

    const frame: ForceTorqueFrame = {
      timestamp: header.timestamp,
      sequenceNumber,
      force,
      torque,
    };

    if (flags & 0x01) {
      const frameIdLen = view.getUint16(offset, false);
      offset += 2;
      const frameIdBytes = new Uint8Array(buffer, offset, frameIdLen);
      frame.sensorFrameId = this.textDecoder.decode(frameIdBytes);
    }

    return { streamId: header.streamId, frame };
  }

  // ==========================================================================
  // Point Cloud Encoding/Decoding
  // ==========================================================================

  /**
   * 编码点云帧 (支持大规模点云)
   */
  encodePointCloud(streamId: number, frame: PointCloudFrame): ArrayBuffer {
    let flags = 0;

    if (frame.colors) flags |= 0x01;
    if (frame.intensities) flags |= 0x02;
    if (frame.normals) flags |= 0x04;

    // Payload: SeqNum(4) + Flags(1) + PointCount(4) + Points(N*12) + [Colors(N*4)] + ...
    let payloadSize = 9 + frame.points.byteLength;
    if (frame.colors) payloadSize += frame.colors.byteLength;
    if (frame.intensities) payloadSize += frame.intensities.byteLength;
    if (frame.normals) payloadSize += frame.normals.byteLength;

    const totalSize = HEADER_SIZE + payloadSize;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    this.encodeHeader(buffer, 0, BinaryMessageType.POINT_CLOUD, streamId, frame.timestamp, payloadSize);

    let offset = HEADER_SIZE;

    view.setUint32(offset, frame.sequenceNumber, false);
    offset += 4;

    view.setUint8(offset, flags);
    offset += 1;

    view.setUint32(offset, frame.pointCount, false);
    offset += 4;

    // Copy points
    new Uint8Array(buffer, offset, frame.points.byteLength).set(new Uint8Array(frame.points.buffer));
    offset += frame.points.byteLength;

    // Optional arrays
    if (frame.colors) {
      new Uint8Array(buffer, offset, frame.colors.byteLength).set(frame.colors);
      offset += frame.colors.byteLength;
    }
    if (frame.intensities) {
      new Uint8Array(buffer, offset, frame.intensities.byteLength).set(
        new Uint8Array(frame.intensities.buffer)
      );
      offset += frame.intensities.byteLength;
    }
    if (frame.normals) {
      new Uint8Array(buffer, offset, frame.normals.byteLength).set(
        new Uint8Array(frame.normals.buffer)
      );
      offset += frame.normals.byteLength;
    }

    return buffer;
  }

  /**
   * 解码点云帧
   */
  decodePointCloud(buffer: ArrayBuffer): { streamId: number; frame: PointCloudFrame } {
    const header = this.decodeHeader(buffer);
    const view = new DataView(buffer);

    let offset = HEADER_SIZE;

    const sequenceNumber = view.getUint32(offset, false);
    offset += 4;

    const flags = view.getUint8(offset);
    offset += 1;

    const pointCount = view.getUint32(offset, false);
    offset += 4;

    // Points (Float32 x 3 per point)
    const pointsByteLength = pointCount * 12;
    const points = new Float32Array(buffer.slice(offset, offset + pointsByteLength));
    offset += pointsByteLength;

    const frame: PointCloudFrame = {
      timestamp: header.timestamp,
      sequenceNumber,
      pointCount,
      points,
    };

    // Optional: Colors (RGBA per point)
    if (flags & 0x01) {
      const colorsByteLength = pointCount * 4;
      frame.colors = new Uint8Array(buffer.slice(offset, offset + colorsByteLength));
      offset += colorsByteLength;
    }

    // Optional: Intensities (Float32 per point)
    if (flags & 0x02) {
      const intensitiesByteLength = pointCount * 4;
      frame.intensities = new Float32Array(buffer.slice(offset, offset + intensitiesByteLength));
      offset += intensitiesByteLength;
    }

    // Optional: Normals (Float32 x 3 per point)
    if (flags & 0x04) {
      const normalsByteLength = pointCount * 12;
      frame.normals = new Float32Array(buffer.slice(offset, offset + normalsByteLength));
      offset += normalsByteLength;
    }

    return { streamId: header.streamId, frame };
  }

  // ==========================================================================
  // Heartbeat
  // ==========================================================================

  /**
   * 编码心跳包
   */
  encodeHeartbeat(): ArrayBuffer {
    const buffer = new ArrayBuffer(HEADER_SIZE);
    this.encodeHeader(buffer, 0, BinaryMessageType.HEARTBEAT, 0, Date.now() * 1000, 0);
    return buffer;
  }

  /**
   * 编码心跳响应
   */
  encodeHeartbeatAck(requestTimestamp: number): ArrayBuffer {
    const buffer = new ArrayBuffer(HEADER_SIZE + 8);
    const view = new DataView(buffer);

    this.encodeHeader(buffer, 0, BinaryMessageType.HEARTBEAT_ACK, 0, Date.now() * 1000, 8);

    // Payload: 原始请求时间戳
    view.setBigUint64(HEADER_SIZE, BigInt(requestTimestamp), false);

    return buffer;
  }

  // ==========================================================================
  // Generic Decode
  // ==========================================================================

  /**
   * 解码任意消息 (仅解析头部)
   */
  decodeMessage(buffer: ArrayBuffer): {
    header: BinaryHeader;
    payload: ArrayBuffer;
  } {
    const header = this.decodeHeader(buffer);
    const payload = buffer.slice(HEADER_SIZE, HEADER_SIZE + header.payloadLength);
    return { header, payload };
  }

  /**
   * 获取消息类型
   */
  getMessageType(buffer: ArrayBuffer): BinaryMessageType {
    const view = new DataView(buffer);
    return view.getUint8(5) as BinaryMessageType;
  }

  /**
   * 通用编码方法
   */
  encode(type: BinaryMessageType, frame: StreamFrame, streamId: number = 0): ArrayBuffer {
    switch (type) {
      case BinaryMessageType.JOINT_STATE:
        return this.encodeJointState(streamId, frame as JointStateFrame);
      case BinaryMessageType.TCP_POSE:
        return this.encodeTcpPose(streamId, frame as TcpPoseFrame);
      case BinaryMessageType.FORCE_TORQUE:
        return this.encodeForceTorque(streamId, frame as ForceTorqueFrame);
      case BinaryMessageType.POINT_CLOUD:
        return this.encodePointCloud(streamId, frame as PointCloudFrame);
      default:
        throw new BinaryProtocolError(
          `Unsupported message type for encoding: ${type}`,
          'UNSUPPORTED_TYPE'
        );
    }
  }

  /**
   * 通用解码方法
   */
  decode(buffer: ArrayBuffer): { type: BinaryMessageType; data: StreamFrame } | null {
    const type = this.getMessageType(buffer);

    switch (type) {
      case BinaryMessageType.JOINT_STATE: {
        const result = this.decodeJointState(buffer);
        return { type, data: result.frame };
      }
      case BinaryMessageType.TCP_POSE: {
        const result = this.decodeTcpPose(buffer);
        return { type, data: result.frame };
      }
      case BinaryMessageType.FORCE_TORQUE: {
        const result = this.decodeForceTorque(buffer);
        return { type, data: result.frame };
      }
      case BinaryMessageType.POINT_CLOUD: {
        const result = this.decodePointCloud(buffer);
        return { type, data: result.frame };
      }
      default:
        return null;
    }
  }
}

// 导出单例实例
export const binaryProtocol = new BinaryProtocol();
