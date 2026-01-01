/**
 * trajx-wasm 视觉测试运行器
 *
 * 主要功能：
 * 1. 加载测试配置
 * 2. 启动测试页面
 * 3. 通过 Chrome MCP 执行测试和截图
 * 4. AI 分析验证结果
 * 5. 生成测试报告
 */

import * as fs from 'fs'
import * as path from 'path'
import { ConfigLoader, loadConfigs } from './config-loader'
import { VisualValidator, generateMCPCommands, generateTestScript } from './visual-validator'
import type {
  TestConfig,
  TestResult,
  TestSuiteResult,
  TestRunnerOptions
} from './types'

// 默认选项
const DEFAULT_OPTIONS: TestRunnerOptions = {
  configDir: path.join(__dirname, 'configs'),
  outputDir: path.join(__dirname, 'results'),
  baselineDir: path.join(__dirname, 'baselines'),
  updateBaselines: false,
  concurrency: 1,
  timeout: 30000,
  verbose: false
}

export class TestRunner {
  private options: TestRunnerOptions
  private configLoader: ConfigLoader | null = null
  private validator: VisualValidator

  constructor(options: Partial<TestRunnerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.validator = new VisualValidator({
      outputDir: this.options.outputDir,
      baseUrl: 'http://localhost:5173/test' // Vite dev server
    })
  }

  /**
   * 初始化测试运行器
   */
  async initialize(): Promise<void> {
    // 确保目录存在
    fs.mkdirSync(this.options.outputDir, { recursive: true })
    fs.mkdirSync(path.join(this.options.outputDir, 'screenshots'), { recursive: true })
    fs.mkdirSync(path.join(this.options.outputDir, 'reports'), { recursive: true })

    // 加载配置
    this.configLoader = await loadConfigs(this.options.configDir)

    if (this.options.verbose) {
      const stats = this.configLoader.getStats()
      console.log(`Loaded ${stats.total} test configurations`)
      console.log('By category:', stats.byCategory)
    }
  }

  /**
   * 运行所有测试
   */
  async runAll(): Promise<TestSuiteResult> {
    if (!this.configLoader) {
      await this.initialize()
    }

    const configs = this.configLoader!.getAll()
    return this.runConfigs(configs)
  }

  /**
   * 按过滤器运行测试
   */
  async runFiltered(pattern: string): Promise<TestSuiteResult> {
    if (!this.configLoader) {
      await this.initialize()
    }

    const configs = this.configLoader!.filter(pattern)
    return this.runConfigs(configs)
  }

  /**
   * 运行单个测试
   */
  async runSingle(configName: string): Promise<TestResult> {
    if (!this.configLoader) {
      await this.initialize()
    }

    const config = this.configLoader!.getByName(configName)
    if (!config) {
      throw new Error(`Config not found: ${configName}`)
    }

    return this.runTest(config)
  }

  /**
   * 运行多个配置
   */
  private async runConfigs(configs: TestConfig[]): Promise<TestSuiteResult> {
    const startTime = new Date()
    const results: TestResult[] = []

    let passed = 0
    let failed = 0
    let errors = 0
    let skipped = 0

    for (const config of configs) {
      try {
        if (this.options.verbose) {
          console.log(`Running test: ${config.name}`)
        }

        const result = await this.runTest(config)
        results.push(result)

        switch (result.status) {
          case 'passed':
            passed++
            break
          case 'failed':
            failed++
            break
          case 'error':
            errors++
            break
          case 'skipped':
            skipped++
            break
        }
      } catch (error) {
        errors++
        results.push({
          configName: config.name,
          status: 'error',
          startTime: new Date(),
          endTime: new Date(),
          error: error instanceof Error ? error.message : String(error),
          checkpointResults: []
        })
      }
    }

    const suiteResult: TestSuiteResult = {
      suiteName: 'trajx-wasm-visual',
      startTime,
      endTime: new Date(),
      totalTests: configs.length,
      passed,
      failed,
      errors,
      skipped,
      results
    }

    // 保存报告
    await this.saveReport(suiteResult)

    return suiteResult
  }

  /**
   * 运行单个测试
   *
   * 注意：实际的 Chrome MCP 调用需要在 Claude Code 中手动执行
   * 这里返回需要执行的命令
   */
  private async runTest(config: TestConfig): Promise<TestResult> {
    const startTime = new Date()
    const testUrl = this.validator.generateTestUrl(config)
    const screenshotPath = this.validator.getScreenshotPath(config.name)

    // 生成 MCP 命令（需要手动执行）
    const mcpCommands = generateMCPCommands(config, testUrl)

    if (this.options.verbose) {
      console.log('='.repeat(60))
      console.log(`Test: ${config.name}`)
      console.log(`URL: ${testUrl}`)
      console.log('MCP Commands to execute:')
      console.log(mcpCommands.join('\n'))
      console.log('='.repeat(60))
    }

    // 返回待执行的测试结果（实际执行需要在 Claude Code 中进行）
    return {
      configName: config.name,
      status: 'skipped', // 标记为待执行
      startTime,
      endTime: new Date(),
      screenshotPath,
      checkpointResults: [],
      error: 'Requires manual execution in Claude Code with Chrome MCP'
    }
  }

  /**
   * 保存测试报告
   */
  private async saveReport(result: TestSuiteResult): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const reportPath = path.join(
      this.options.outputDir,
      'reports',
      `report-${timestamp}.json`
    )

    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2))

    // 生成 Markdown 报告
    const mdReport = this.generateMarkdownReport(result)
    const mdPath = path.join(
      this.options.outputDir,
      'reports',
      `report-${timestamp}.md`
    )
    fs.writeFileSync(mdPath, mdReport)

    if (this.options.verbose) {
      console.log(`Report saved to: ${reportPath}`)
      console.log(`Markdown report saved to: ${mdPath}`)
    }
  }

  /**
   * 生成 Markdown 格式报告
   */
  private generateMarkdownReport(result: TestSuiteResult): string {
    const lines: string[] = []

    lines.push('# trajx-wasm 视觉测试报告')
    lines.push('')
    lines.push(`**测试套件:** ${result.suiteName}`)
    lines.push(`**开始时间:** ${result.startTime.toISOString()}`)
    lines.push(`**结束时间:** ${result.endTime.toISOString()}`)
    lines.push(`**持续时间:** ${(result.endTime.getTime() - result.startTime.getTime()) / 1000}s`)
    lines.push('')
    lines.push('## 总体结果')
    lines.push('')
    lines.push(`| 指标 | 数量 |`)
    lines.push(`|------|------|`)
    lines.push(`| 总测试数 | ${result.totalTests} |`)
    lines.push(`| 通过 | ${result.passed} |`)
    lines.push(`| 失败 | ${result.failed} |`)
    lines.push(`| 错误 | ${result.errors} |`)
    lines.push(`| 跳过 | ${result.skipped} |`)
    lines.push('')
    lines.push('## 详细结果')
    lines.push('')

    for (const test of result.results) {
      const statusEmoji = {
        passed: '✅',
        failed: '❌',
        error: '⚠️',
        skipped: '⏭️'
      }[test.status]

      lines.push(`### ${statusEmoji} ${test.configName}`)
      lines.push('')
      lines.push(`- **状态:** ${test.status}`)
      lines.push(`- **持续时间:** ${(test.endTime.getTime() - test.startTime.getTime()) / 1000}s`)

      if (test.screenshotPath) {
        lines.push(`- **截图:** ${test.screenshotPath}`)
      }

      if (test.error) {
        lines.push(`- **错误:** ${test.error}`)
      }

      if (test.checkpointResults.length > 0) {
        lines.push('')
        lines.push('**检查点结果:**')
        lines.push('')
        for (const cp of test.checkpointResults) {
          const cpEmoji = cp.passed ? '✅' : '❌'
          lines.push(`- ${cpEmoji} ${cp.checkpointName}: ${cp.details}`)
        }
      }

      if (test.aiAnalysis) {
        lines.push('')
        lines.push('**AI 分析:**')
        lines.push('')
        lines.push(`> ${test.aiAnalysis.overallAssessment}`)

        if (test.aiAnalysis.issues.length > 0) {
          lines.push('')
          lines.push('**发现的问题:**')
          for (const issue of test.aiAnalysis.issues) {
            lines.push(`- [${issue.severity}] ${issue.description}`)
          }
        }

        if (test.aiAnalysis.suggestions.length > 0) {
          lines.push('')
          lines.push('**建议:**')
          for (const suggestion of test.aiAnalysis.suggestions) {
            lines.push(`- ${suggestion}`)
          }
        }
      }

      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 获取测试统计
   */
  getStats(): { total: number; byCategory: Record<string, number> } | null {
    return this.configLoader?.getStats() || null
  }
}

/**
 * CLI 入口
 */
export async function main(args: string[]): Promise<void> {
  const runner = new TestRunner({ verbose: true })
  await runner.initialize()

  const filter = args[0]
  if (filter) {
    console.log(`Running tests matching: ${filter}`)
    await runner.runFiltered(filter)
  } else {
    console.log('Running all tests')
    await runner.runAll()
  }
}

// 支持直接运行
if (require.main === module) {
  main(process.argv.slice(2)).catch(console.error)
}
