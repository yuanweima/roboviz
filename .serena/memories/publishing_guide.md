# React 组件发布与集成指南

## 当前构建产物
- **构建工具**: tsup（CJS + ESM 双格式 + `.d.ts` 类型声明）
- **子入口**: `@aspect/roboviz-core` 有 5 个子入口（rendering/kinematics/planning/protocol）
- **peerDependencies**: react, react-dom, trajx-wasm(可选)

## 发布流程

### 1. 私有 Registry 配置
```ini
# .npmrc
@aspect:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```
每个 package.json 添加：
```json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  }
}
```
可选方案：npm 私有 org、Verdaccio 自托管、GitLab Packages。

### 2. 版本管理（Changesets）
```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```
- 每次 PR 运行 `pnpm changeset` 记录变更
- 发布时 `pnpm changeset version` 自动升版本 + 生成 CHANGELOG
- `pnpm changeset publish` 发布到 registry
- `workspace:*` 会在发布时自动替换为实际版本号

### 3. CI/CD 自动发布
GitHub Actions workflow：PR 合并到 main 后自动构建 + 发布。

## 其他系统集成方式

### A. 标准 npm 安装（推荐）
```bash
npm install @aspect/roboviz-core @aspect/roboviz-react
```
```tsx
// 按需导入，tree-shaking 友好
import { Robot } from '@aspect/roboviz-core/rendering';
import { useHybridSolver } from '@aspect/roboviz-core/kinematics';
```
适用于：所有使用 React 的项目（Next.js, Vite, CRA 等）

### B. Provider 模式集成
```tsx
import { SolverProvider } from '@aspect/roboviz-core/kinematics';
import { PlannerProvider } from '@aspect/roboviz-core/planning';

function App() {
  return (
    <SolverProvider solver={mySolver}>
      <PlannerProvider planner={myPlanner}>
        <RobotViewer />
      </PlannerProvider>
    </SolverProvider>
  );
}
```
按需包裹 Provider，不需要的功能不引入。

### C. iframe 嵌入 Viewer
`@aspect/roboviz-viewer` 构建后部署为独立页面：
```html
<iframe src="https://roboviz.internal/viewer?urdf=..." />
```
适用于：非 React 系统、CMS、旧系统集成。通过 postMessage 通信。

### D. Web Components 封装（可选）
将 React 组件封装为 Custom Element：
```typescript
import { createRoot } from 'react-dom/client';
class RobotViewer extends HTMLElement {
  connectedCallback() {
    const root = createRoot(this);
    root.render(<Robot urdfContent={this.getAttribute('urdf')} />);
  }
}
customElements.define('robot-viewer', RobotViewer);
```
适用于：Angular、Vue、Svelte 或纯 HTML 项目。

### E. UMD/CDN 打包（可选）
通过 Vite library mode 或 rollup 生成 UMD bundle：
```html
<script src="https://cdn.example.com/roboviz.umd.js"></script>
<script>
  RoboViz.createViewer(document.getElementById('root'), { urdf: '...' });
</script>
```
适用于：无构建工具的环境、快速原型。

## 发布前检查清单
- [ ] `pnpm build` 无报错
- [ ] `pnpm test` 全部通过
- [ ] package.json 中 `"sideEffects": false` 确保 tree-shaking
- [ ] `"files"` 字段只包含 `dist/`
- [ ] peerDependencies 版本范围正确
- [ ] 类型声明文件 `.d.ts` 正常生成
- [ ] 子入口 exports 配置完整（import/require/types 三种条件）
