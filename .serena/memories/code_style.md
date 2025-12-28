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
