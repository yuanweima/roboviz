/**
 * 配置加载器 - 加载和管理测试配置
 */
import * as fs from 'fs'
import * as path from 'path'
import type { TestConfig, TestCategory } from './types'

export class ConfigLoader {
  private configDir: string
  private configs: Map<string, TestConfig> = new Map()

  constructor(configDir: string) {
    this.configDir = configDir
  }

  /**
   * 加载所有配置文件
   */
  async loadAll(): Promise<TestConfig[]> {
    const files = fs.readdirSync(this.configDir).filter(f => f.endsWith('.json'))
    const configs: TestConfig[] = []

    for (const file of files) {
      try {
        const config = await this.loadConfig(file)
        configs.push(config)
        this.configs.set(config.name, config)
      } catch (error) {
        console.error(`Failed to load config ${file}:`, error)
      }
    }

    return configs
  }

  /**
   * 加载单个配置文件
   */
  async loadConfig(filename: string): Promise<TestConfig> {
    const filePath = path.join(this.configDir, filename)
    const content = fs.readFileSync(filePath, 'utf-8')
    const config = JSON.parse(content) as TestConfig

    // 验证配置结构
    this.validateConfig(config, filename)

    return config
  }

  /**
   * 按类别获取配置
   */
  getByCategory(category: TestCategory): TestConfig[] {
    return Array.from(this.configs.values()).filter(c => c.category === category)
  }

  /**
   * 按名称获取配置
   */
  getByName(name: string): TestConfig | undefined {
    return this.configs.get(name)
  }

  /**
   * 按过滤器获取配置
   */
  filter(pattern: string): TestConfig[] {
    const regex = new RegExp(pattern, 'i')
    return Array.from(this.configs.values()).filter(c =>
      regex.test(c.name) || regex.test(c.description)
    )
  }

  /**
   * 验证配置结构
   */
  private validateConfig(config: TestConfig, filename: string): void {
    const required = ['name', 'category', 'description', 'params', 'expectedBehavior', 'checkpoints']
    for (const field of required) {
      if (!(field in config)) {
        throw new Error(`Config ${filename} missing required field: ${field}`)
      }
    }

    const validCategories: TestCategory[] = ['fk', 'ik', 'collision', 'planning', 'batch']
    if (!validCategories.includes(config.category)) {
      throw new Error(`Config ${filename} has invalid category: ${config.category}`)
    }

    if (!Array.isArray(config.checkpoints) || config.checkpoints.length === 0) {
      throw new Error(`Config ${filename} must have at least one checkpoint`)
    }
  }

  /**
   * 获取所有已加载的配置
   */
  getAll(): TestConfig[] {
    return Array.from(this.configs.values())
  }

  /**
   * 获取配置统计信息
   */
  getStats(): { total: number; byCategory: Record<TestCategory, number> } {
    const byCategory: Record<TestCategory, number> = {
      fk: 0,
      ik: 0,
      collision: 0,
      planning: 0,
      batch: 0
    }

    for (const config of this.configs.values()) {
      byCategory[config.category]++
    }

    return {
      total: this.configs.size,
      byCategory
    }
  }
}

/**
 * 从目录创建配置加载器并加载所有配置
 */
export async function loadConfigs(configDir: string): Promise<ConfigLoader> {
  const loader = new ConfigLoader(configDir)
  await loader.loadAll()
  return loader
}
