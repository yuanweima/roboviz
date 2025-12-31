/**
 * trajx-wasm 视觉测试类型定义
 */

/** 测试配置类型 */
export type TestCategory =
  | 'fk'           // 正运动学
  | 'ik'           // 逆运动学
  | 'collision'    // 碰撞检测
  | 'planning'     // 路径规划
  | 'batch'        // 批量操作

/** 单个测试配置 */
export interface TestConfig {
  /** 测试名称 */
  name: string
  /** 测试类别 */
  category: TestCategory
  /** 测试描述 */
  description: string
  /** 测试参数 */
  params: TestParams
  /** 期望结果描述（用于AI验证） */
  expectedBehavior: string
  /** 验证检查点 */
  checkpoints: VerificationCheckpoint[]
}

/** 测试参数 */
export interface TestParams {
  /** 机器人URDF路径 */
  urdfPath?: string
  /** 关节角度 */
  jointAngles?: number[]
  /** 目标位姿 */
  targetPose?: Pose
  /** 障碍物列表 */
  obstacles?: Obstacle[]
  /** 规划参数 */
  planningParams?: PlanningParams
  /** 自定义参数 */
  [key: string]: unknown
}

/** 位姿定义 */
export interface Pose {
  position: [number, number, number]
  quaternion: [number, number, number, number]
}

/** 障碍物定义 */
export interface Obstacle {
  type: 'box' | 'sphere' | 'cylinder'
  position: [number, number, number]
  dimensions: number[]
}

/** 规划参数 */
export interface PlanningParams {
  planner: 'birrt' | 'rrt' | 'prm'
  maxIterations?: number
  stepSize?: number
  goalBias?: number
}

/** 验证检查点 */
export interface VerificationCheckpoint {
  /** 检查点名称 */
  name: string
  /** 验证问题（AI回答） */
  question: string
  /** 期望答案关键词 */
  expectedKeywords: string[]
  /** 是否为关键检查点 */
  critical: boolean
}

/** 测试结果 */
export interface TestResult {
  /** 测试配置名称 */
  configName: string
  /** 测试状态 */
  status: 'passed' | 'failed' | 'error' | 'skipped'
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime: Date
  /** 截图路径 */
  screenshotPath?: string
  /** AI分析结果 */
  aiAnalysis?: AIAnalysisResult
  /** 错误信息 */
  error?: string
  /** 检查点结果 */
  checkpointResults: CheckpointResult[]
}

/** AI分析结果 */
export interface AIAnalysisResult {
  /** 总体评估 */
  overallAssessment: string
  /** 发现的问题 */
  issues: Issue[]
  /** 建议 */
  suggestions: string[]
  /** 原始分析文本 */
  rawAnalysis: string
}

/** 检查点结果 */
export interface CheckpointResult {
  /** 检查点名称 */
  checkpointName: string
  /** 是否通过 */
  passed: boolean
  /** AI回答 */
  aiResponse: string
  /** 分析细节 */
  details: string
}

/** 发现的问题 */
export interface Issue {
  /** 问题类型 */
  type: 'visual' | 'behavior' | 'performance' | 'error'
  /** 严重程度 */
  severity: 'critical' | 'major' | 'minor'
  /** 问题描述 */
  description: string
  /** 可能的原因 */
  possibleCause?: string
  /** 建议的解决方案 */
  suggestedFix?: string
}

/** 测试套件结果 */
export interface TestSuiteResult {
  /** 套件名称 */
  suiteName: string
  /** 开始时间 */
  startTime: Date
  /** 结束时间 */
  endTime: Date
  /** 总测试数 */
  totalTests: number
  /** 通过数 */
  passed: number
  /** 失败数 */
  failed: number
  /** 错误数 */
  errors: number
  /** 跳过数 */
  skipped: number
  /** 各测试结果 */
  results: TestResult[]
}

/** 测试运行器选项 */
export interface TestRunnerOptions {
  /** 配置目录 */
  configDir: string
  /** 结果输出目录 */
  outputDir: string
  /** 基线目录 */
  baselineDir: string
  /** 是否更新基线 */
  updateBaselines: boolean
  /** 并行测试数 */
  concurrency: number
  /** 超时时间（毫秒） */
  timeout: number
  /** 测试过滤（正则） */
  filter?: string
  /** 详细日志 */
  verbose: boolean
}
