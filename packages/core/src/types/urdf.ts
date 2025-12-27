/**
 * URDF Type Definitions
 *
 * Type definitions and type guards for URDF-loaded robot objects.
 * These types correspond to the urdf-loader library output.
 */

import type { Object3D } from 'three';

/**
 * URDF Joint types supported by the urdf-loader
 */
export type URDFJointType =
  | 'revolute'
  | 'prismatic'
  | 'continuous'
  | 'fixed'
  | 'floating'
  | 'planar';

/**
 * URDF Joint interface from urdf-loader
 *
 * Represents a movable joint in a URDF robot model.
 */
export interface URDFJoint extends Object3D {
  /** Identifies this object as a URDF joint */
  readonly isURDFJoint: true;

  /** The type of joint (revolute, prismatic, etc.) */
  jointType: URDFJointType;

  /** Current joint value(s) - array to support multi-DOF joints */
  jointValue: number[];

  /** Joint axis direction (normalized vector) */
  axis?: { x: number; y: number; z: number };

  /** Joint limits (if specified in URDF) */
  limit?: {
    lower: number;
    upper: number;
    effort?: number;
    velocity?: number;
  };

  /** The name of this joint from the URDF */
  name: string;

  /**
   * Set the joint value(s)
   * @param value - Single value or array of values
   */
  setJointValue(value: number | number[]): void;
}

/**
 * URDF Link interface from urdf-loader
 *
 * Represents a rigid body (link) in a URDF robot model.
 */
export interface URDFLink extends Object3D {
  /** Identifies this object as a URDF link */
  readonly isURDFLink: true;

  /** The name of this link from the URDF */
  name: string;
}

/**
 * URDF Robot interface from urdf-loader
 *
 * The root object returned when loading a URDF file.
 */
export interface URDFRobot extends Object3D {
  /** Identifies this object as a URDF robot */
  readonly isURDFRobot: true;

  /** Robot name from URDF */
  robotName: string;

  /** Map of joint names to joint objects */
  joints: Map<string, URDFJoint>;

  /** Map of link names to link objects */
  links: Map<string, URDFLink>;

  /**
   * Set a joint value by name
   * @param jointName - The name of the joint
   * @param value - The value to set
   */
  setJointValue(jointName: string, value: number | number[]): void;

  /**
   * Set multiple joint values at once
   * @param values - Object mapping joint names to values
   */
  setJointValues(values: Record<string, number | number[]>): void;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an Object3D is a URDFLink
 *
 * @example
 * ```typescript
 * robot.traverse((child) => {
 *   if (isURDFLink(child)) {
 *     console.log('Found link:', child.name);
 *   }
 * });
 * ```
 */
export function isURDFLink(obj: Object3D): obj is URDFLink {
  return 'isURDFLink' in obj && (obj as URDFLink).isURDFLink === true;
}

/**
 * Type guard to check if an Object3D is a URDFJoint
 *
 * @example
 * ```typescript
 * robot.traverse((child) => {
 *   if (isURDFJoint(child)) {
 *     console.log('Found joint:', child.name, 'type:', child.jointType);
 *   }
 * });
 * ```
 */
export function isURDFJoint(obj: Object3D): obj is URDFJoint {
  return 'isURDFJoint' in obj && (obj as URDFJoint).isURDFJoint === true;
}

/**
 * Type guard to check if an Object3D is a URDFRobot
 */
export function isURDFRobot(obj: Object3D): obj is URDFRobot {
  return 'isURDFRobot' in obj && (obj as URDFRobot).isURDFRobot === true;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find the last (deepest) URDF link in a robot tree
 *
 * This is typically the end-effector link.
 *
 * @param root - The root object to search (usually the robot)
 * @returns The last URDFLink found, or undefined if none
 *
 * @example
 * ```typescript
 * const endEffector = findLastURDFLink(robot);
 * if (endEffector) {
 *   console.log('End effector:', endEffector.name);
 * }
 * ```
 */
export function findLastURDFLink(root: Object3D): URDFLink | undefined {
  let lastLink: URDFLink | undefined;

  root.traverse((child) => {
    if (isURDFLink(child)) {
      lastLink = child;
    }
  });

  return lastLink;
}

/**
 * Find all URDF joints in a robot tree
 *
 * @param root - The root object to search
 * @returns Array of all URDFJoint objects found
 */
export function findAllURDFJoints(root: Object3D): URDFJoint[] {
  const joints: URDFJoint[] = [];

  root.traverse((child) => {
    if (isURDFJoint(child)) {
      joints.push(child);
    }
  });

  return joints;
}

/**
 * Find all movable (non-fixed) joints in a robot tree
 *
 * @param root - The root object to search
 * @returns Array of movable URDFJoint objects
 */
export function findMovableJoints(root: Object3D): URDFJoint[] {
  return findAllURDFJoints(root).filter((joint) => joint.jointType !== 'fixed');
}

/**
 * Find a URDF link by name
 *
 * @param root - The root object to search
 * @param name - The link name to find
 * @returns The URDFLink if found, undefined otherwise
 */
export function findURDFLinkByName(root: Object3D, name: string): URDFLink | undefined {
  let foundLink: URDFLink | undefined;

  root.traverse((child) => {
    if (isURDFLink(child) && child.name === name) {
      foundLink = child;
    }
  });

  return foundLink;
}

/**
 * Find a URDF joint by name
 *
 * @param root - The root object to search
 * @param name - The joint name to find
 * @returns The URDFJoint if found, undefined otherwise
 */
export function findURDFJointByName(root: Object3D, name: string): URDFJoint | undefined {
  let foundJoint: URDFJoint | undefined;

  root.traverse((child) => {
    if (isURDFJoint(child) && child.name === name) {
      foundJoint = child;
    }
  });

  return foundJoint;
}
