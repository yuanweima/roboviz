# trajx-wasm 视觉测试执行示例

本文档展示如何使用 Claude Code + Chrome MCP 执行完整的测试循环。

## 完整测试流程示例

### 测试 1: 基础 FK 测试 (fk-basic)

#### Step 1: 启动测试页面

```
请在浏览器中打开测试页面，执行以下操作：
```

调用 Chrome MCP 导航：
```javascript
// 导航到测试页面
mcp__chrome-devtools__navigate_page({
  url: "http://localhost:5173/test-page.html?testName=fk-basic&config={\"jointAngles\":[0,0,0,0,0,0],\"urdfPath\":\"../../fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf\"}"
})
```

#### Step 2: 等待页面加载

```javascript
// 等待页面显示 "Ready" 状态
mcp__chrome-devtools__wait_for({
  text: "Ready",
  timeout: 15000
})
```

#### Step 3: 截取屏幕截图

```javascript
// 截图保存到结果目录
mcp__chrome-devtools__take_screenshot({
  filePath: "/Users/lt0440/conductor/workspaces/roboviz/walla-walla-v1/packages/core/test/trajx-wasm-visual/results/screenshots/fk-basic.png"
})
```

#### Step 4: AI 视觉分析

使用 Read 工具读取截图，然后让 Claude 分析：

**分析提示词：**
```
分析这个机器人可视化截图。

期望行为：机器人应显示在初始位置（所有关节角度为0），末端执行器应指向前方。机器人各连杆应正确连接，无断裂或重叠。

请回答以下检查点问题：

1. [robot-visible] 机器人模型是否完整可见？所有连杆是否正确渲染？
   期望关键词：可见、完整、正确

2. [joint-positions] 机器人是否处于初始姿态（零位）？各关节是否未旋转？
   期望关键词：初始、零位、未旋转

3. [no-visual-artifacts] 画面中是否有视觉错误，如穿模、闪烁或异常渲染？
   期望关键词：没有、正常、无

请逐一回答每个问题，并给出总体评估。
```

#### Step 5: 记录结果

根据 AI 分析结果，记录：
- 每个检查点是否通过
- 发现的问题列表
- 建议的修复方案

---

### 测试 2: 旋转 FK 测试 (fk-rotated)

#### Step 1: 导航

```javascript
mcp__chrome-devtools__navigate_page({
  url: "http://localhost:5173/test-page.html?testName=fk-rotated&config={\"jointAngles\":[0.5,-0.3,0.8,0,0.5,0]}"
})
```

#### Step 2-5: 同上

**分析提示词：**
```
分析这个机器人可视化截图。

期望行为：机器人应显示旋转后的姿态：第一关节旋转约28度，第二关节反向旋转约17度，第三关节旋转约46度，第五关节旋转约28度。末端执行器应指向不同方向。

请回答以下检查点问题：

1. [joint1-rotated] 第一个关节（基座旋转）是否有明显旋转？
2. [arm-pose-changed] 机器人手臂的整体姿态是否与初始位置明显不同？
3. [links-connected] 所有连杆之间的连接是否正确，没有断裂？
```

---

### 测试 3: 碰撞检测测试 (collision-basic)

#### Step 1: 导航

```javascript
mcp__chrome-devtools__navigate_page({
  url: "http://localhost:5173/test-page.html?testName=collision-basic&config={\"jointAngles\":[0,0,0,0,0,0],\"obstacles\":[{\"type\":\"box\",\"position\":[0.3,0,0.3],\"dimensions\":[0.1,0.1,0.1]}]}"
})
```

**分析提示词：**
```
分析这个机器人可视化截图。

期望行为：场景中应显示机器人和一个立方体障碍物。碰撞检测系统应正确识别障碍物。

请回答以下检查点问题：

1. [obstacle-visible] 场景中是否可以看到障碍物（立方体）？
2. [robot-and-obstacle-separate] 机器人和障碍物是否正确分开显示，没有严重的穿透？
3. [collision-indicator] 是否有任何碰撞状态的视觉指示（如颜色变化、标记等）？
```

---

## 问题分析与修复循环

### 当测试失败时

**示例：FK 计算结果不正确**

1. **问题识别**
   - AI 报告：关节位置与期望不符
   - 截图显示：机器人姿态异常

2. **问题定位**
   ```
   检查 trajx-wasm FK 计算：
   - 查看 packages/core/vendor/trajx-wasm/trajx_wasm.js
   - 检查 URDF 解析是否正确
   - 验证关节旋转轴方向
   ```

3. **修复代码**
   ```javascript
   // 修复示例：纠正关节旋转方向
   const correctedAngle = jointAngle * -1; // 如果方向反了
   ```

4. **重新测试**
   - 重新执行测试流程
   - 验证修复是否有效
   - 更新基线截图（如果需要）

---

## 批量测试执行

### 执行所有 FK 测试

```javascript
// 依次执行所有 FK 类别的测试
const fkTests = ['fk-basic', 'fk-rotated'];

for (const testName of fkTests) {
  // 1. 导航
  // 2. 等待
  // 3. 截图
  // 4. 分析
  // 5. 记录结果
}
```

### 生成测试报告

执行完所有测试后，查看生成的报告：
- `results/reports/report-TIMESTAMP.json` - JSON 格式详细结果
- `results/reports/report-TIMESTAMP.md` - Markdown 可读报告

---

## 自动化集成提示

### 在 CI/CD 中使用

1. 使用 Playwright 或 Puppeteer 替代手动 Chrome MCP 调用
2. 使用 OpenAI Vision API 进行自动化图像分析
3. 设置阈值判断测试通过/失败

### 回归测试

1. 保存已验证的截图到 `baselines/` 目录
2. 每次测试后进行像素对比
3. 差异超过阈值时标记为失败

---

## 常见问题

### Q: 测试页面无法加载？
A: 确保开发服务器正在运行：`pnpm dev`

### Q: Chrome MCP 连接失败？
A: 检查 Chrome DevTools Protocol 端口是否正确配置

### Q: AI 分析结果不准确？
A: 尝试更具体的分析提示词，或添加更多参考信息

### Q: 如何添加新的测试类型？
A: 在 `configs/` 目录创建新的 JSON 配置文件，定义测试参数和检查点
