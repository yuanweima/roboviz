# trajx-wasm 视觉测试框架

严格测试 trajx-wasm 正确性的自动化视觉测试框架。

## 测试流程

```
┌──────────────────────────────────────────────────────────────────┐
│                        测试循环流程                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 加载配置 ──→ 2. 启动测试页面 ──→ 3. 执行trajx-wasm操作       │
│       │                                      │                   │
│       ↓                                      ↓                   │
│  configs/*.json              Chrome MCP: navigate_page           │
│                                                                  │
│  4. Chrome MCP截图 ──→ 5. AI视觉分析 ──→ 6. 验证检查点           │
│       │                      │                │                  │
│       ↓                      ↓                ↓                  │
│  take_screenshot      Claude分析图像    关键词匹配验证            │
│                                                                  │
│  7. 记录结果 ──→ 8. 问题分析 ──→ 9. 下一个配置或结束             │
│       │              │                                           │
│       ↓              ↓                                           │
│  results/reports/   AI给出修复建议                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
trajx-wasm-visual/
├── configs/                # 测试配置文件
│   ├── fk-basic.json      # 基础FK测试
│   ├── fk-rotated.json    # 旋转FK测试
│   ├── ik-basic.json      # 基础IK测试
│   └── collision-basic.json # 碰撞检测测试
│
├── baselines/              # 基准截图（可选）
├── results/
│   ├── screenshots/       # 测试截图
│   └── reports/           # 测试报告
│
├── types.ts               # 类型定义
├── config-loader.ts       # 配置加载器
├── visual-validator.ts    # 视觉验证器
├── test-runner.ts         # 测试运行器
├── test-page.html         # 测试页面模板
└── README.md              # 本文件
```

## 快速开始

### 1. 启动开发服务器

```bash
cd packages/core
pnpm dev
```

### 2. 在 Claude Code 中执行测试

使用以下命令序列进行测试：

```
# Step 1: 导航到测试页面
mcp__chrome-devtools__navigate_page({
  url: "http://localhost:5173/test/trajx-wasm-visual/test-page.html?testName=fk-basic&config={\"jointAngles\":[0,0,0,0,0,0]}"
})

# Step 2: 等待页面就绪
mcp__chrome-devtools__wait_for({
  text: "ready",
  timeout: 10000
})

# Step 3: 截取屏幕截图
mcp__chrome-devtools__take_screenshot({
  filePath: "./packages/core/test/trajx-wasm-visual/results/screenshots/fk-basic.png"
})

# Step 4: 读取截图进行AI分析
Read 工具读取截图文件，然后让 Claude 分析
```

### 3. AI 分析验证

Claude 会根据配置中的检查点问题分析截图：

- **robot-visible**: 机器人模型是否完整可见？
- **joint-positions**: 关节位置是否正确？
- **no-visual-artifacts**: 是否有视觉错误？

## 测试配置格式

```json
{
  "name": "test-name",
  "category": "fk|ik|collision|planning|batch",
  "description": "测试描述",
  "params": {
    "urdfPath": "路径",
    "jointAngles": [0, 0, 0, 0, 0, 0],
    "targetPose": { "position": [x,y,z], "quaternion": [w,x,y,z] },
    "obstacles": [{ "type": "box", "position": [x,y,z], "dimensions": [w,h,d] }]
  },
  "expectedBehavior": "期望行为描述",
  "checkpoints": [
    {
      "name": "checkpoint-id",
      "question": "验证问题",
      "expectedKeywords": ["关键词1", "关键词2"],
      "critical": true
    }
  ]
}
```

## 测试类别

| 类别 | 描述 | 关键参数 |
|------|------|----------|
| `fk` | 正运动学 | `jointAngles` |
| `ik` | 逆运动学 | `targetPose` |
| `collision` | 碰撞检测 | `obstacles` |
| `planning` | 路径规划 | `planningParams` |
| `batch` | 批量操作 | `batch` |

## 添加新测试

1. 在 `configs/` 目录创建新的 JSON 配置文件
2. 定义测试参数和检查点
3. 运行测试并验证结果
4. 可选：保存正确结果截图到 `baselines/`

## 问题分析与修复循环

当测试失败时：

1. **查看截图** - 检查视觉输出
2. **分析 AI 报告** - 查看检测到的问题
3. **定位问题** - 根据建议查找代码
4. **修复代码** - 修改 trajx-wasm 或渲染逻辑
5. **重新测试** - 验证修复有效

## Chrome MCP 命令参考

| 命令 | 用途 |
|------|------|
| `navigate_page` | 导航到测试URL |
| `wait_for` | 等待页面元素 |
| `take_screenshot` | 截取屏幕截图 |
| `take_snapshot` | 获取页面DOM快照 |
| `evaluate_script` | 执行JavaScript |
| `list_console_messages` | 获取控制台日志 |

## 最佳实践

1. **从简单开始** - 先测试基础 FK，再测试复杂功能
2. **渐进式添加** - 每次只添加一个测试配置
3. **保存基线** - 验证正确后保存截图作为参考
4. **详细检查点** - 定义具体的验证问题
5. **关键标记** - 标记 `critical: true` 的检查点不能失败
