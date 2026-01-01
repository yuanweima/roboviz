# AI-Friendly Documentation Strategy for RoboViz

## 核心原则

现代项目文档需要服务两类读者：
1. **人类开发者** - 需要概念理解、教程、API 参考
2. **AI 助手** - 需要快速定位、结构化信息、上下文边界

## 推荐的文档结构

```
docs/
├── CLAUDE.md              # AI 入口文件 (Claude Code 自动读取)
├── ARCHITECTURE.md        # 高层架构概述
├──
├── api/                   # API 参考
│   ├── INDEX.md           # API 概览和导航
│   ├── kinematics.md
│   ├── planning.md
│   └── components.md
│
├── guides/                # 人类开发者指南
│   ├── getting-started.md
│   ├── integration.md
│   └── troubleshooting.md
│
├── decisions/             # 架构决策记录 (ADR)
│   ├── 001-coordinate-system.md
│   ├── 002-wasm-data-format.md
│   └── template.md
│
└── internal/              # 内部实现文档
    ├── wasm-api-contracts.md
    ├── data-flow.md
    └── pitfalls.md        # 已知陷阱和踩坑记录
```

## CLAUDE.md - AI 入口文件

这是最重要的文件。Claude Code 在对话开始时会自动读取项目根目录或 `.claude/` 目录下的 `CLAUDE.md`。

### 示例结构

```markdown
# RoboViz - AI Context

## Quick Facts
- **Type**: 3D Robot Visualization Library
- **Stack**: React + Three.js + WASM (Rust)
- **Monorepo**: pnpm + Turbo
- **Coordinate System**: Z-up (robotics standard)

## Build & Test
\`\`\`bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm dev              # Start dev server
\`\`\`

## Key Directories
- `packages/core/src/kinematics/` - IK/FK solvers
- `packages/core/src/planning/` - Motion planning (BiRRT, RRT*, PRM)
- `packages/core/src/components/` - React 3D components
- `packages/core/src/wasm/` - WASM bindings (trajx-wasm)

## Critical Patterns

### WASM Data Format Warning ⚠️
WASM `getPathFlat()` returns: `[dof, n_waypoints, j1, j2, ...]`
First 2 elements are METADATA, not joint values!
Always use: `rawPath.slice(2)` before parsing as joints.

### Coordinate System
All 3D coordinates use Z-up convention:
- X: forward
- Y: left
- Z: up

## Architecture Decision Records
See `docs/decisions/` for important design decisions.

## Common Tasks
- Add new component: See `docs/guides/new-component.md`
- Debug IK issues: Check `usePoseIK` → `useHybridSolver` → `kinematics-manager`
- Motion planning: `planning-manager.ts` → WASM planners
```

## 关键特点

### 1. 结构化的"Quick Facts"
AI 可以快速提取项目基本信息：
```markdown
## Quick Facts
- **Type**: [项目类型]
- **Stack**: [技术栈]
- **Coordinate System**: [坐标系统]
```

### 2. 可执行的命令列表
直接可复制执行的命令：
```bash
pnpm build   # 构建
pnpm test    # 测试
```

### 3. Key Directories 映射
告诉 AI 在哪里找什么：
```markdown
- `src/kinematics/` - IK/FK 相关
- `src/planning/` - 运动规划
```

### 4. Critical Patterns / Pitfalls
**最重要的部分** - 记录踩过的坑：
```markdown
### WASM Data Format Warning ⚠️
WASM `getPathFlat()` returns: `[dof, n_waypoints, ...]`
First 2 elements are METADATA!
```

### 5. 架构决策记录 (ADR)
每个重要决策一个文件：
```markdown
# ADR-002: WASM Flat Array Format

## Context
WASM returns flat arrays for performance.

## Decision
Format: `[dof, n_waypoints, j1_1, j2_1, ...]`

## Consequences
- Callers must skip first 2 elements
- Validation should check first waypoint against joint limits
```

## 内部文档：Pitfalls.md

记录所有踩过的坑：

```markdown
# Known Pitfalls

## P001: WASM getPathFlat() Metadata Prefix
**Symptom**: First waypoint has values like [6.0, 30.0, ...] (DOF and count)
**Cause**: Forgot to skip metadata prefix in WASM return
**Fix**: `rawPath.slice(2)`
**Files**: `planning-manager.ts:610`

## P002: Coordinate System Mismatch
**Symptom**: Robot renders upside down or sideways
**Cause**: Mixing Y-up (Three.js default) with Z-up (URDF standard)
**Fix**: Use `coordinateSystem: 'Z-up'` in hooks
**Files**: `useHybridSolver`, `TrajectoryFK`
```

## 为什么这种结构对 AI 友好？

1. **层次分明**: 从高层 (CLAUDE.md) 到细节 (ADR) 有清晰路径
2. **可搜索**: 每个文件专注一个主题，便于 grep/glob
3. **自包含**: 每个 ADR/Pitfall 包含完整上下文
4. **可机器解析**: 使用一致的 markdown 格式
5. **版本控制**: 文档随代码一起演进

## 实施建议

1. **立即创建** `CLAUDE.md` 或 `.claude/CLAUDE.md`
2. **渐进式添加** ADR - 每次重大决策写一个
3. **持续更新** Pitfalls - 每次 debug 后记录
4. **定期清理** - 删除过时文档，保持准确性

## 工具支持

### Claude Code 自动读取
- `CLAUDE.md` 在项目根目录
- `.claude/CLAUDE.md`
- `.claude/commands/*.md` (自定义命令)

### Serena Memory 系统
- `.serena/memories/*.md`
- 适合项目特定的持久化知识

### 代码内文档
- JSDoc 注释带 `@see` 链接到相关文档
- 关键警告使用 `⚠️` 或 `IMPORTANT:` 前缀
