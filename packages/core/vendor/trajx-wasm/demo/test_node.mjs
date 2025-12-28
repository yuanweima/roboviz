// Node.js test script for trajx-wasm tool and collision systems
import * as wasm from '../pkg/trajx_wasm.js';

console.log('=== Trajx WASM Node.js Tests ===\n');
console.log(`Version: ${wasm.version()}`);
console.log(`Ready: ${wasm.is_ready()}\n`);

// Test URDF
const TEST_URDF = `<?xml version="1.0"?>
<robot name="test_robot">
  <link name="base_link"/>
  <link name="link1"/>
  <link name="link2"/>
  <link name="link3"/>
  <link name="link4"/>
  <link name="link5"/>
  <link name="link6"/>
  <link name="tool0"/>

  <joint name="joint1" type="revolute">
    <parent link="base_link"/>
    <child link="link1"/>
    <origin xyz="0 0 0.1" rpy="0 0 0"/>
    <axis xyz="0 0 1"/>
    <limit lower="-3.14159" upper="3.14159" velocity="2.0" effort="100"/>
  </joint>

  <joint name="joint2" type="revolute">
    <parent link="link1"/>
    <child link="link2"/>
    <origin xyz="0 0 0.2" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.0" upper="2.0" velocity="2.0" effort="100"/>
  </joint>

  <joint name="joint3" type="revolute">
    <parent link="link2"/>
    <child link="link3"/>
    <origin xyz="0 0 0.3" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.5" upper="2.5" velocity="2.0" effort="100"/>
  </joint>

  <joint name="joint4" type="revolute">
    <parent link="link3"/>
    <child link="link4"/>
    <origin xyz="0 0 0.2" rpy="0 0 0"/>
    <axis xyz="0 0 1"/>
    <limit lower="-3.14159" upper="3.14159" velocity="3.0" effort="50"/>
  </joint>

  <joint name="joint5" type="revolute">
    <parent link="link4"/>
    <child link="link5"/>
    <origin xyz="0 0 0.1" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.0" upper="2.0" velocity="3.0" effort="50"/>
  </joint>

  <joint name="joint6" type="revolute">
    <parent link="link5"/>
    <child link="link6"/>
    <origin xyz="0 0 0.1" rpy="0 0 0"/>
    <axis xyz="0 0 1"/>
    <limit lower="-3.14159" upper="3.14159" velocity="3.0" effort="50"/>
  </joint>

  <joint name="tool_joint" type="fixed">
    <parent link="link6"/>
    <child link="tool0"/>
    <origin xyz="0 0 0.05" rpy="0 0 0"/>
  </joint>
</robot>`;

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (e) {
        console.log(`✗ ${name}: ${e.message}`);
        failed++;
    }
}

// === Tool System Tests ===
console.log('\n--- Tool System Tests ---\n');

test('WasmTcpPoint.simple()', () => {
    const tcp = wasm.WasmTcpPoint.simple("camera", 0.02, 0.0, 0.05);
    if (tcp.name !== "camera") throw new Error(`Expected 'camera', got '${tcp.name}'`);
});

test('WasmTcpPoint.withStandoff()', () => {
    const tcp = wasm.WasmTcpPoint.simple("test", 0, 0, 0.1);
    const tcpWithStandoff = tcp.withStandoff(0.2);
    if (tcpWithStandoff.defaultStandoff !== 0.2) throw new Error(`Expected 0.2, got ${tcpWithStandoff.defaultStandoff}`);
});

test('WasmTcpPoint.withStandoffRange()', () => {
    const tcp = wasm.WasmTcpPoint.simple("test", 0, 0, 0.1).withStandoff(0.2).withStandoffRange(0.1, 0.5);
    const range = tcp.getStandoffRange();
    if (range[0] !== 0.1 || range[1] !== 0.5) throw new Error(`Expected [0.1, 0.5], got [${range[0]}, ${range[1]}]`);
});

test('WasmTcpPoint.validateStandoff()', () => {
    const tcp = wasm.WasmTcpPoint.simple("test", 0, 0, 0.1).withStandoff(0.2).withStandoffRange(0.1, 0.5);
    if (!tcp.validateStandoff(0.3)) throw new Error('Expected 0.3 to be valid');
    if (tcp.validateStandoff(0.05)) throw new Error('Expected 0.05 to be invalid');
});

test('WasmTcpPoint.withApproachAxis()', () => {
    const tcp = wasm.WasmTcpPoint.simple("test", 0, 0, 0.1).withApproachAxis(0, 0, 1);
    const axis = tcp.getApproachAxis();
    if (axis[2] !== 1) throw new Error(`Expected axis z=1, got ${axis[2]}`);
});

test('WasmTcpPoint.getOffset()', () => {
    const tcp = wasm.WasmTcpPoint.simple("test", 0.1, 0.2, 0.3);
    const offset = tcp.getOffset();
    if (Math.abs(offset.position.z - 0.3) > 0.001) throw new Error(`Expected z=0.3, got ${offset.position.z}`);
});

test('WasmTool constructor', () => {
    const tool = new wasm.WasmTool("vision_welder");
    if (tool.name !== "vision_welder") throw new Error(`Expected 'vision_welder', got '${tool.name}'`);
});

test('WasmTool.simplePosition()', () => {
    const tool = wasm.WasmTool.simplePosition("torch", 0, 0, 0.15);
    if (tool.name !== "torch") throw new Error(`Expected 'torch', got '${tool.name}'`);
    // simplePosition creates a tool with flange offset only, no TCPs
    if (tool.tcpCount !== 0) throw new Error(`Expected tcpCount=0 (flange offset only), got ${tool.tcpCount}`);
});

test('WasmTool.addTcp()', () => {
    const tool = new wasm.WasmTool("multi");
    tool.addTcp("tip1", [0, 0, 0.1], [0, 0, 0, 1], 0.05);
    tool.addTcp("tip2", [0, 0, 0.2], [0, 0, 0, 1], 0.1);
    if (tool.tcpCount !== 2) throw new Error(`Expected tcpCount=2, got ${tool.tcpCount}`);
    if (!tool.isMultiTcp) throw new Error('Expected isMultiTcp=true');
});

test('WasmTool.tcpNames()', () => {
    const tool = new wasm.WasmTool("test");
    tool.addTcp("tcp1", [0, 0, 0.1], [0, 0, 0, 1], 0.05);
    tool.addTcp("tcp2", [0, 0, 0.2], [0, 0, 0, 1], 0.1);
    const names = tool.tcpNames();
    if (!names.includes("tcp1") || !names.includes("tcp2")) throw new Error(`Unexpected TCP names: ${names}`);
});

test('WasmTool.setActiveTcp()', () => {
    const tool = new wasm.WasmTool("test");
    tool.addTcp("tcp1", [0, 0, 0.1], [0, 0, 0, 1], 0.05);
    tool.addTcp("tcp2", [0, 0, 0.2], [0, 0, 0, 1], 0.1);
    tool.setActiveTcp("tcp2");
    if (tool.activeTcpName !== "tcp2") throw new Error(`Expected 'tcp2', got '${tool.activeTcpName}'`);
});

test('WasmTool.getActiveDefaultStandoff()', () => {
    const tool = new wasm.WasmTool("test");
    tool.addTcp("tip", [0, 0, 0.1], [0, 0, 0, 1], 0.123);
    tool.setActiveTcp("tip");
    const standoff = tool.getActiveDefaultStandoff();
    if (Math.abs(standoff - 0.123) > 0.001) throw new Error(`Expected 0.123, got ${standoff}`);
});

test('WasmTool.excludeObstacle()', () => {
    const tool = new wasm.WasmTool("test");
    tool.addSimpleTcp("tip", 0, 0, 0.1);
    tool.excludeObstacle("workpiece");
    if (!tool.isObstacleExcluded("workpiece")) throw new Error('Expected workpiece to be excluded');
    const excluded = tool.getExcludedObstacles();
    if (!excluded.includes("workpiece")) throw new Error('Excluded list should contain workpiece');
});

test('WasmTool.mass and centerOfMass', () => {
    const tool = new wasm.WasmTool("test");
    tool.addSimpleTcp("tip", 0, 0, 0.1);
    tool.setMass(2.5);
    tool.setCenterOfMass(0, 0, 0.05);
    if (Math.abs(tool.mass - 2.5) > 0.001) throw new Error(`Expected mass=2.5, got ${tool.mass}`);
    const com = tool.getCenterOfMass();
    // getCenterOfMass returns a formatted string like "0,0,0.05"
    if (!com) throw new Error('Expected getCenterOfMass to return non-empty string');
});

test('WasmTool.computeStandoffPose()', () => {
    const tool = wasm.WasmTool.simplePosition("laser", 0, 0, 0.1);
    const pose = tool.computeStandoffPose([0.5, 0.3, 0.1], [0, 0, -1], 0.05);
    // Position should be target + standoff * approach = [0.5, 0.3, 0.1 + 0.05*(-1)] = [0.5, 0.3, 0.05]
    if (Math.abs(pose.position.z - 0.05) > 0.01) {
        throw new Error(`Expected z~0.05, got ${pose.position.z}`);
    }
});

test('WasmToolLibrary constructor', () => {
    const lib = new wasm.WasmToolLibrary();
    if (lib.len !== 0) throw new Error(`Expected len=0, got ${lib.len}`);
});

test('WasmToolLibrary.addTool()', () => {
    const lib = new wasm.WasmToolLibrary();
    const tool = wasm.WasmTool.simplePosition("torch", 0, 0, 0.15);
    lib.addTool(tool);
    if (lib.len !== 1) throw new Error(`Expected len=1, got ${lib.len}`);
});

test('WasmToolLibrary.activateTool()', () => {
    const lib = new wasm.WasmToolLibrary();
    lib.addTool(wasm.WasmTool.simplePosition("torch", 0, 0, 0.15));
    lib.addTool(wasm.WasmTool.simplePosition("gripper", 0, 0, 0.08));
    lib.activateTool("gripper");
    if (lib.activeToolName !== "gripper") throw new Error(`Expected 'gripper', got '${lib.activeToolName}'`);
});

test('WasmToolLibrary.hasTool()', () => {
    const lib = new wasm.WasmToolLibrary();
    lib.addTool(wasm.WasmTool.simplePosition("torch", 0, 0, 0.15));
    if (!lib.hasTool("torch")) throw new Error('Expected hasTool("torch")=true');
    if (lib.hasTool("unknown")) throw new Error('Expected hasTool("unknown")=false');
});

test('WasmToolLibrary.removeTool()', () => {
    const lib = new wasm.WasmToolLibrary();
    lib.addTool(wasm.WasmTool.simplePosition("torch", 0, 0, 0.15));
    lib.addTool(wasm.WasmTool.simplePosition("gripper", 0, 0, 0.08));
    lib.removeTool("torch");
    if (lib.len !== 1) throw new Error(`Expected len=1, got ${lib.len}`);
    if (lib.hasTool("torch")) throw new Error('Torch should have been removed');
});

// === Collision System Tests ===
console.log('\n--- Collision System Tests ---\n');

test('CollisionEnvironment constructor', () => {
    const env = new wasm.CollisionEnvironment();
    if (env.numObstacles !== 0) throw new Error(`Expected 0 obstacles, got ${env.numObstacles}`);
});

test('CollisionEnvironment.addBox()', () => {
    const env = new wasm.CollisionEnvironment();
    const pose = new wasm.Pose(new wasm.Position(0.5, 0, 0.3), new wasm.Quaternion(0, 0, 0, 1));
    env.addBox("table", [0.3, 0.2, 0.02], pose);
    if (env.numObstacles !== 1) throw new Error(`Expected 1 obstacle, got ${env.numObstacles}`);
});

test('CollisionEnvironment.addSphere()', () => {
    const env = new wasm.CollisionEnvironment();
    env.addSphere("ball", 0.05, [0.3, 0.2, 0.4]);
    if (env.numObstacles !== 1) throw new Error(`Expected 1 obstacle, got ${env.numObstacles}`);
});

test('CollisionEnvironment.addCylinder()', () => {
    const env = new wasm.CollisionEnvironment();
    const pose = new wasm.Pose(new wasm.Position(0, 0.5, 0.2), new wasm.Quaternion(0, 0, 0, 1));
    env.addCylinder("pillar", 0.05, 0.2, pose);
    if (env.numObstacles !== 1) throw new Error(`Expected 1 obstacle, got ${env.numObstacles}`);
});

test('CollisionEnvironment.obstacleIds()', () => {
    const env = new wasm.CollisionEnvironment();
    env.addSphere("ball", 0.05, [0, 0, 0]);
    const ids = env.obstacleIds();
    if (!ids.includes("ball")) throw new Error(`Expected 'ball' in ids: ${ids}`);
});

test('CollisionEnvironment.removeObstacle()', () => {
    const env = new wasm.CollisionEnvironment();
    env.addSphere("ball", 0.05, [0, 0, 0]);
    const removed = env.removeObstacle("ball");
    if (!removed) throw new Error('Expected removeObstacle to return true');
    if (env.numObstacles !== 0) throw new Error(`Expected 0 obstacles, got ${env.numObstacles}`);
});

test('CollisionEnvironment.updateObstaclePose()', () => {
    const env = new wasm.CollisionEnvironment();
    const pose1 = new wasm.Pose(new wasm.Position(0, 0, 0), new wasm.Quaternion(0, 0, 0, 1));
    env.addBox("box", [0.1, 0.1, 0.1], pose1);
    const pose2 = new wasm.Pose(new wasm.Position(1, 0, 0), new wasm.Quaternion(0, 0, 0, 1));
    env.updateObstaclePose("box", pose2);
    // No error means success
});

test('WasmCompositeObstacle constructor', () => {
    const comp = new wasm.WasmCompositeObstacle("workpiece");
    if (comp.id !== "workpiece") throw new Error(`Expected 'workpiece', got '${comp.id}'`);
});

test('WasmCompositeObstacle.addBoxPart()', () => {
    const comp = new wasm.WasmCompositeObstacle("workpiece");
    comp.addBoxPart("base", [0.1, 0.1, 0.02], [0, 0, 0], [0, 0, 0, 1]);
    if (comp.numParts !== 1) throw new Error(`Expected 1 part, got ${comp.numParts}`);
});

test('WasmCompositeObstacle.addSpherePart()', () => {
    const comp = new wasm.WasmCompositeObstacle("workpiece");
    comp.addSpherePart("knob", 0.03, [0, 0, 0.05]);
    if (comp.numParts !== 1) throw new Error(`Expected 1 part, got ${comp.numParts}`);
});

test('WasmCompositeObstacle.addCylinderPart()', () => {
    const comp = new wasm.WasmCompositeObstacle("workpiece");
    comp.addCylinderPart("pin", 0.02, 0.05, [0.05, 0.05, 0.07], [0, 0, 0, 1]);
    if (comp.numParts !== 1) throw new Error(`Expected 1 part, got ${comp.numParts}`);
});

test('WasmCompositeObstacle.setBasePose()', () => {
    const comp = new wasm.WasmCompositeObstacle("workpiece");
    comp.addBoxPart("base", [0.1, 0.1, 0.02], [0, 0, 0], [0, 0, 0, 1]);
    const pose = new wasm.Pose(new wasm.Position(0.5, 0.3, 0.1), new wasm.Quaternion(0, 0, 0, 1));
    comp.setBasePose(pose);
    // No error means success
});

test('CollisionEnvironment.addCompositeObstacle()', () => {
    const env = new wasm.CollisionEnvironment();
    const comp = new wasm.WasmCompositeObstacle("workpiece");
    comp.addBoxPart("base", [0.1, 0.1, 0.02], [0, 0, 0], [0, 0, 0, 1]);
    env.addCompositeObstacle(comp);
    const ids = env.compositeObstacleIds();
    if (!ids.includes("workpiece")) throw new Error(`Expected 'workpiece' in composite ids: ${ids}`);
});

test('CollisionEnvironment.totalObstacles()', () => {
    const env = new wasm.CollisionEnvironment();
    env.addSphere("ball", 0.05, [0, 0, 0]);
    const comp = new wasm.WasmCompositeObstacle("workpiece");
    comp.addBoxPart("base", [0.1, 0.1, 0.02], [0, 0, 0], [0, 0, 0, 1]);
    env.addCompositeObstacle(comp);
    if (env.totalObstacles !== 2) throw new Error(`Expected totalObstacles=2, got ${env.totalObstacles}`);
});

test('CollisionEnvironment.checkShapeCollision() - colliding', () => {
    const env = new wasm.CollisionEnvironment();
    const boxPose = new wasm.Pose(new wasm.Position(0, 0, 0), new wasm.Quaternion(0, 0, 0, 1));
    env.addBox("obstacle", [0.1, 0.1, 0.1], boxPose);
    const spherePose = new wasm.Pose(new wasm.Position(0.05, 0, 0), new wasm.Quaternion(0, 0, 0, 1));
    const collision = env.checkShapeCollision("sphere", [0.1], spherePose);
    if (!collision) throw new Error('Expected collision=true');
});

test('CollisionEnvironment.checkShapeCollision() - not colliding', () => {
    const env = new wasm.CollisionEnvironment();
    const boxPose = new wasm.Pose(new wasm.Position(0, 0, 0), new wasm.Quaternion(0, 0, 0, 1));
    env.addBox("obstacle", [0.1, 0.1, 0.1], boxPose);
    const spherePose = new wasm.Pose(new wasm.Position(0.5, 0, 0), new wasm.Quaternion(0, 0, 0, 1));
    const collision = env.checkShapeCollision("sphere", [0.1], spherePose);
    if (collision) throw new Error('Expected collision=false');
});

test('CollisionEnvironment.isCollisionFree()', () => {
    const env = new wasm.CollisionEnvironment();
    const boxPose = new wasm.Pose(new wasm.Position(0, 0, 0), new wasm.Quaternion(0, 0, 0, 1));
    env.addBox("obstacle", [0.1, 0.1, 0.1], boxPose);
    const free = env.isCollisionFree([0.5, 0, 0], 0.05);
    if (!free) throw new Error('Expected isCollisionFree=true');
});

test('CollisionEnvironment.ignoreLinkObstaclePair()', () => {
    const env = new wasm.CollisionEnvironment();
    env.addSphere("ball", 0.05, [0, 0, 0]);
    env.ignoreLinkObstaclePair("base_link", "ball");
    const ignored = env.isLinkObstaclePairIgnored("base_link", "ball");
    if (!ignored) throw new Error('Expected pair to be ignored');
});

test('CollisionEnvironment.unignoreLinkObstaclePair()', () => {
    const env = new wasm.CollisionEnvironment();
    env.addSphere("ball", 0.05, [0, 0, 0]);
    env.ignoreLinkObstaclePair("base_link", "ball");
    env.unignoreLinkObstaclePair("base_link", "ball");
    const ignored = env.isLinkObstaclePairIgnored("base_link", "ball");
    if (ignored) throw new Error('Expected pair to not be ignored');
});

test('CollisionEnvironment.ignoreLink()', () => {
    const env = new wasm.CollisionEnvironment();
    env.ignoreLink("tool0");
    const links = env.getIgnoredLinks();
    if (!links.includes("tool0")) throw new Error(`Expected 'tool0' in ignored links: ${links}`);
});

test('CollisionEnvironment.ignoreObstacle()', () => {
    const env = new wasm.CollisionEnvironment();
    env.ignoreObstacle("workpiece");
    const obstacles = env.getIgnoredObstacles();
    if (!obstacles.includes("workpiece")) throw new Error(`Expected 'workpiece' in ignored obstacles: ${obstacles}`);
});

test('CollisionEnvironment.clearAcm()', () => {
    const env = new wasm.CollisionEnvironment();
    env.ignoreLink("tool0");
    env.ignoreObstacle("workpiece");
    env.clearAcm();
    if (env.getIgnoredLinks().length !== 0) throw new Error('Expected 0 ignored links after clear');
    if (env.getIgnoredObstacles().length !== 0) throw new Error('Expected 0 ignored obstacles after clear');
});

// === Robot Integration Tests ===
console.log('\n--- Robot Integration Tests ---\n');

test('Robot.attachTool()', () => {
    const robot = wasm.createRobot(TEST_URDF);
    const tool = wasm.WasmTool.simplePosition("torch", 0, 0, 0.12);
    const offset = tool.getActiveTcpOffset();
    robot.attachTool(offset);
    if (!robot.hasTool()) throw new Error('Expected hasTool()=true');
});

test('Robot.detachTool()', () => {
    const robot = wasm.createRobot(TEST_URDF);
    const tool = wasm.WasmTool.simplePosition("torch", 0, 0, 0.12);
    const offset = tool.getActiveTcpOffset();
    robot.attachTool(offset);
    robot.detachTool();
    if (robot.hasTool()) throw new Error('Expected hasTool()=false');
});

test('FK with tool affects position (forwardKinematicsTcp)', () => {
    const robot = wasm.createRobot(TEST_URDF);
    const joints = new Float64Array([0, 0, 0, 0, 0, 0]);

    // FK without tool
    const poseNoTool = robot.forwardKinematicsTcp(joints);

    // Attach tool
    const tool = wasm.WasmTool.simplePosition("torch", 0, 0, 0.12);
    robot.attachTool(tool.getActiveTcpOffset());

    // FK with tool using forwardKinematicsTcp
    const poseWithTool = robot.forwardKinematicsTcp(joints);

    // Position should differ by tool length (0.12m in z)
    const zDiff = poseWithTool.position.z - poseNoTool.position.z;
    if (Math.abs(zDiff - 0.12) > 0.01) {
        throw new Error(`Expected z difference ~0.12, got ${zDiff}`);
    }
});

// Summary
console.log('\n========================================');
console.log(`Tests passed: ${passed}`);
console.log(`Tests failed: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
    process.exit(1);
}
