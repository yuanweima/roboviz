# 代码风格指南

## 通用规范
- 使用 TypeScript，要求严格类型
- React 函数组件 + Hooks
- 使用 JSDoc 注释描述接口和函数

## 命名规范
- 组件: PascalCase (e.g., `JogControlPanel`)
- Hooks: camelCase with `use` prefix (e.g., `useRobotJogControl`)
- Types/Interfaces: PascalCase (e.g., `JogControlState`)
- 文件名: 与导出的主要实体匹配

## 文件组织
- 每个组件通常有独立目录
- `index.ts` 作为模块入口
- `types.ts` 存放类型定义
- `styles.ts` 存放样式工具函数

## 导出规范
- 使用 named exports
- 同时导出类型和实现
- 在 `index.ts` 中集中导出

## 示例结构
```
JogControlPanel/
├── index.ts           # 模块入口
├── JogControlPanel.tsx # 主组件
├── JogButton.tsx      # 子组件
├── useRobotJogControl.ts # Hook
├── types.ts           # 类型定义
└── styles.ts          # 样式
```

## 架构模式

### Sub-Module Exports（子模块导出）
包通过 `package.json` 的 `exports` 字段提供子模块入口，允许用户按需导入：
```typescript
// 只导入渲染（不依赖 WASM）
import { Robot } from '@aspect/roboviz-core/rendering';
// 只导入运动学
import { useHybridSolver } from '@aspect/roboviz-core/kinematics';
```
每个子入口有独立的 `*-entry.ts` 源文件，避免拉入不必要的依赖。

### Provider 依赖注入模式
使用 React Context Provider（`SolverProvider`, `PlannerProvider`）注入可选的重量级依赖：
- 核心组件（`Robot`, `GhostRobot`）无需 Provider 即可工作
- Provider 包裹后可获得扩展功能（IK 求解、运动规划）
```tsx
<SolverProvider solver={hybridSolver}>
  <Robot urdfContent={urdf} />
  <GhostRobot /> {/* 自动获得 IK 能力 */}
</SolverProvider>
```

### 双模式 Hooks
Hooks 如 `useHybridSolver` 设计为可在有/无 Context Provider 时均能工作：
- 通过 `useSolverContextOptional` 检测是否有 Provider
- 无 Provider 时走传统路径，有 Provider 时使用注入的求解器
- 保证向后兼容

### 异步状态管理
依赖异步操作（WASM 初始化、远程 API）的 Hooks 需正确管理状态：
- 暴露 `ready`, `loading`, `error` 状态
- 使用 `useCallback` + `useRef` 做防抖
- 动态 `import('trajx-wasm')` 延迟加载 WASM

### TypeScript 类型守卫
使用类型守卫安全访问扩展能力：
```typescript
if (hasMultiIk(solver)) {
  solver.solveMultiIK(targets);
}
```
