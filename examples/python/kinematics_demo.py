"""
Kinematics Demo — IK/FK, workspace analysis, singularity detection.

Usage:
    python kinematics_demo.py

Requires a running RoboViz viewer (the SDK starts one automatically).
"""

import roboviz as rv
from roboviz import Pose, Vector3, Quaternion

# ---------------------------------------------------------------------------
# 1. Start viewer and load robot
# ---------------------------------------------------------------------------
rv.init()
robot = rv.add_robot("path/to/fanuc_lr_mate_200id_7l.urdf", id="fanuc")

# Create kinematics solver (model name must match known DH table)
solver = robot.create_solver("Fanuc_LR_Mate_200iD_7L")
print(f"Solver: {solver}")
print(f"  DOF = {solver.dof}")
print(f"  Analytical IK = {solver.supports_analytical_ik}")

# ---------------------------------------------------------------------------
# 2. Forward Kinematics
# ---------------------------------------------------------------------------
home = [0.0, -0.3, 0.6, 0.0, -0.3, 0.0]
robot.set_joints(home)

pose = solver.fk(home)
print(f"\nFK at home:")
print(f"  Position: ({pose.position.x:.4f}, {pose.position.y:.4f}, {pose.position.z:.4f})")
print(f"  Orientation: w={pose.orientation.w:.4f}")

# Full chain — get pose for every link
chain = solver.fk_chain(home)
print(f"\nFK chain ({len(chain)} links):")
for i, p in enumerate(chain[:3]):
    print(f"  Link {i}: ({p.position.x:.3f}, {p.position.y:.3f}, {p.position.z:.3f})")

# ---------------------------------------------------------------------------
# 3. Inverse Kinematics
# ---------------------------------------------------------------------------
target = Pose(
    position=Vector3(0.4, 0.1, 0.3),
    orientation=Quaternion(w=0.707, x=0.0, y=0.707, z=0.0),
)

result = solver.ik(target, seed=home)
print(f"\nIK result: success={result.success}")
if result.success:
    print(f"  Joints: {[f'{j:.4f}' for j in result.joints]}")
    if result.error is not None:
        print(f"  Error: {result.error:.6f}")

# All solutions
all_solutions = solver.ik_all(target)
print(f"\nIK all solutions: {len(all_solutions)} found")
for i, sol in enumerate(all_solutions):
    print(f"  Solution {i}: {'OK' if sol.success else 'FAIL'} — {[f'{j:.3f}' for j in sol.joints]}")

# ---------------------------------------------------------------------------
# 4. Workspace Analysis
# ---------------------------------------------------------------------------
analysis = solver.analyze_workspace(home)
print(f"\nWorkspace analysis:")
print(f"  Manipulability:      {analysis.manipulability:.6f}")
print(f"  Condition number:    {analysis.condition_number:.2f}")
print(f"  Near singularity:    {analysis.is_near_singularity}")

# Check reachability of target
reach = solver.is_reachable(target)
print(f"\nReachability: {reach.reachable}")
if reach.distance is not None:
    print(f"  Distance metric: {reach.distance:.4f}")

# Singularity check
singular = solver.is_near_singularity(home, threshold=0.01)
print(f"\nNear singularity (threshold=0.01): {singular}")

# Manipulability scalar
manip = solver.compute_manipulability(home)
print(f"Manipulability: {manip:.6f}")

# ---------------------------------------------------------------------------
# 5. Jacobian
# ---------------------------------------------------------------------------
J = solver.compute_jacobian(home)
print(f"\nJacobian shape: {len(J)}x{len(J[0]) if J else 0}")

# ---------------------------------------------------------------------------
# 6. Validation
# ---------------------------------------------------------------------------
valid = solver.is_valid_config(home)
print(f"\nConfig valid: {valid}")

dh = solver.get_dh_params()
print(f"DH parameters ({len(dh)} joints):")
for i, p in enumerate(dh):
    print(f"  J{i}: a={p.a:.4f}  alpha={p.alpha:.4f}  d={p.d:.4f}  theta={p.theta:.4f}")

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
solver.dispose()
rv.show()
