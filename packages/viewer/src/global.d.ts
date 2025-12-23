declare module 'urdf-loader' {
  import type { Object3D, LoadingManager, Material, Mesh } from 'three';

  export interface URDFJoint extends Object3D {
    isURDFJoint: boolean;
    jointType: 'revolute' | 'prismatic' | 'continuous' | 'fixed' | 'floating' | 'planar';
    jointValue: number[];
    limit?: {
      lower: number;
      upper: number;
    };
    setJointValue(value: number | number[]): void;
  }

  export interface URDFLink extends Object3D {
    isURDFLink: boolean;
  }

  export interface URDFRobot extends Object3D {
    isURDFRobot: boolean;
    robotName: string;
    joints: { [key: string]: URDFJoint };
    links: { [key: string]: URDFLink };
    setJointValue(jointName: string, value: number | number[]): void;
    setJointValues(jointValues: { [key: string]: number | number[] }): void;
  }

  export type URDFMeshLoadCb = (
    path: string,
    manager: LoadingManager,
    onComplete: (mesh: Object3D) => void
  ) => void;

  export default class URDFLoader {
    loadMeshCb: URDFMeshLoadCb;
    load(
      url: string,
      onComplete: (robot: URDFRobot) => void,
      onProgress?: (progress: ProgressEvent) => void,
      onError?: (error: Error) => void
    ): void;
    parse(content: string | Document): URDFRobot;
  }
}
