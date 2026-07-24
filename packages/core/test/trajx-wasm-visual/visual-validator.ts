/**
 * 视觉验证器 - 使用 Chrome MCP 进行截图和 AI 分析
 *
 * 这个模块提供了与 Chrome DevTools MCP 集成的接口，
 * 用于自动化的视觉测试验证。
 *
 * 注意：实际的 MCP 调用需要在 Claude Code 环境中执行，
 * 这里定义的是接口和流程逻辑。
 */

import type {
  TestConfig,
  TestResult,
  AIAnalysisResult,
  CheckpointResult,
  Issue,
  VerificationCheckpoint
} from './types'
import * as fs from 'fs'
import * as path from 'path'

/** Chrome MCP 操作接口 */
export interface ChromeMCPOperations {
  /** 导航到页面 */
  navigatePage(url: string): Promise<void>
  /** 等待页面加载 */
  waitFor(text: string, timeout?: number): Promise<void>
  /** 截取屏幕截图 */
  takeScreenshot(filePath: string): Promise<string>
  /** 获取页面快照 */
  takeSnapshot(): Promise<string>
  /** 执行脚本 */
  evaluateScript(script: string): Promise<unknown>
}

/** AI 分析接口 */
export interface AIAnalyzer {
  /** 分析截图 */
  analyzeScreenshot(
    screenshotPath: string,
    prompt: string
  ): Promise<string>

  /** 回答检查点问题 */
  answerCheckpoint(
    screenshotPath: string,
    question: string
  ): Promise<string>
}

export class VisualValidator {
  private outputDir: string
  private baseUrl: string

  constructor(options: {
    outputDir: string
    baseUrl: string
  }) {
    this.outputDir = options.outputDir
    this.baseUrl = options.baseUrl

    // 确保输出目录存在
    fs.mkdirSync(path.join(this.outputDir, 'screenshots'), { recursive: true })
    fs.mkdirSync(path.join(this.outputDir, 'reports'), { recursive: true })
  }

  /**
   * 生成测试页面 URL
   */
  generateTestUrl(config: TestConfig): string {
    const params = new URLSearchParams()
    params.set('config', JSON.stringify(config.params))
    params.set('testName', config.name)
    return `${this.baseUrl}?${params.toString()}`
  }

  /**
   * 生成截图文件路径
   */
  getScreenshotPath(configName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return path.join(this.outputDir, 'screenshots', `${configName}-${timestamp}.png`)
  }

  /**
   * 验证检查点
   */
  async verifyCheckpoint(
    checkpoint: VerificationCheckpoint,
    aiResponse: string
  ): Promise<CheckpointResult> {
    const lowerResponse = aiResponse.toLowerCase()
    const matchedKeywords = checkpoint.expectedKeywords.filter(
      keyword => lowerResponse.includes(keyword.toLowerCase())
    )

    const passed = matchedKeywords.length >= Math.ceil(checkpoint.expectedKeywords.length / 2)

    return {
      checkpointName: checkpoint.name,
      passed,
      aiResponse,
      details: `Matched ${matchedKeywords.length}/${checkpoint.expectedKeywords.length} keywords: ${matchedKeywords.join(', ')}`
    }
  }

  /**
   * 分析 AI 响应中的问题
   */
  extractIssues(aiAnalysis: string): Issue[] {
    const issues: Issue[] = []

    // 检测常见问题模式
    const patterns: Array<{
      pattern: RegExp
      type: Issue['type']
      severity: Issue['severity']
      description: string
    }> = [
      {
        pattern: /穿模|穿透|重叠/i,
        type: 'visual',
        severity: 'major',
        description: '模型穿透或重叠问题'
      },
      {
        pattern: /断裂|断开|分离/i,
        type: 'visual',
        severity: 'critical',
        description: '连杆连接断裂'
      },
      {
        pattern: /不可见|看不到|消失/i,
        type: 'visual',
        severity: 'critical',
        description: '元素不可见'
      },
      {
        pattern: /错误|异常|失败/i,
        type: 'error',
        severity: 'major',
        description: '运行时错误'
      },
      {
        pattern: /卡顿|缓慢|延迟/i,
        type: 'performance',
        severity: 'minor',
        description: '性能问题'
      },
      {
        pattern: /闪烁|抖动/i,
        type: 'visual',
        severity: 'minor',
        description: '渲染不稳定'
      }
    ]

    for (const { pattern, type, severity, description } of patterns) {
      if (pattern.test(aiAnalysis)) {
        issues.push({
          type,
          severity,
          description
        })
      }
    }

    return issues
  }

  /**
   * 生成总体分析结果
   */
  generateAnalysisResult(
    checkpointResults: CheckpointResult[],
    rawAnalysis: string
  ): AIAnalysisResult {
    const issues = this.extractIssues(rawAnalysis)

    const criticalFailed = checkpointResults.some(
      r => !r.passed && r.checkpointName.includes('critical')
    )

    const passRate = checkpointResults.filter(r => r.passed).length / checkpointResults.length

    let overallAssessment: string
    if (criticalFailed) {
      overallAssessment = '关键检查点失败，测试不通过'
    } else if (passRate >= 0.8) {
      overallAssessment = '测试基本通过，可能有小问题需要关注'
    } else if (passRate >= 0.5) {
      overallAssessment = '部分检查点失败，需要进一步调查'
    } else {
      overallAssessment = '多数检查点失败，存在严重问题'
    }

    const suggestions: string[] = []
    if (issues.some(i => i.type === 'visual')) {
      suggestions.push('检查渲染管线和模型加载逻辑')
    }
    if (issues.some(i => i.type === 'error')) {
      suggestions.push('查看控制台日志获取错误详情')
    }
    if (issues.some(i => i.type === 'performance')) {
      suggestions.push('考虑优化渲染性能或减少模型复杂度')
    }

    return {
      overallAssessment,
      issues,
      suggestions,
      rawAnalysis
    }
  }

  /**
   * 创建测试结果
   */
  createTestResult(
    config: TestConfig,
    checkpointResults: CheckpointResult[],
    aiAnalysis: AIAnalysisResult,
    screenshotPath: string,
    startTime: Date
  ): TestResult {
    const criticalFailed = config.checkpoints
      .filter(c => c.critical)
      .some(c => {
        const result = checkpointResults.find(r => r.checkpointName === c.name)
        return result && !result.passed
      })

    const allPassed = checkpointResults.every(r => r.passed)

    return {
      configName: config.name,
      status: criticalFailed ? 'failed' : allPassed ? 'passed' : 'failed',
      startTime,
      endTime: new Date(),
      screenshotPath,
      aiAnalysis,
      checkpointResults
    }
  }
}

/**
 * 生成 MCP 命令模板
 *
 * 这些命令需要在 Claude Code 中执行
 */
export function generateMCPCommands(config: TestConfig, testPageUrl: string): string[] {
  const commands: string[] = []

  commands.push(`// 1. 导航到测试页面`)
  commands.push(`mcp__chrome-devtools__navigate_page({ url: "${testPageUrl}" })`)

  commands.push(`\n// 2. 等待页面加载完成`)
  commands.push(`mcp__chrome-devtools__wait_for({ text: "ready", timeout: 10000 })`)

  commands.push(`\n// 3. 截取屏幕截图`)
  const screenshotPath = `./results/screenshots/${config.name}.png`
  commands.push(`mcp__chrome-devtools__take_screenshot({ filePath: "${screenshotPath}" })`)

  commands.push(`\n// 4. AI 分析截图`)
  const analysisPrompt = `分析这个机器人可视化截图。${config.expectedBehavior}\n\n请检查以下几点并回答：\n${config.checkpoints.map(c => `- ${c.question}`).join('\n')}`
  commands.push(`// 使用 Read 工具读取截图，然后分析`)

  return commands
}

/**
 * 生成测试执行脚本（用于在测试页面中执行）
 */
export function generateTestScript(config: TestConfig): string {
  return `
(async () => {
  const config = ${JSON.stringify(config.params, null, 2)};

  // 初始化测试环境
  console.log('[TEST] Starting test: ${config.name}');
  console.log('[TEST] Category: ${config.category}');

  try {
    // 根据测试类别执行相应操作
    switch ('${config.category}') {
      case 'fk':
        await window.testFK(config);
        break;
      case 'ik':
        await window.testIK(config);
        break;
      case 'collision':
        await window.testCollision(config);
        break;
      case 'planning':
        await window.testPlanning(config);
        break;
      case 'batch':
        await window.testBatch(config);
        break;
    }

    console.log('[TEST] Test completed successfully');
    document.body.setAttribute('data-test-status', 'ready');
  } catch (error) {
    console.error('[TEST] Test failed:', error);
    document.body.setAttribute('data-test-status', 'error');
    document.body.setAttribute('data-test-error', error.message);
  }
})();
`
}
