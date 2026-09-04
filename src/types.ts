export type GameStatus = 'READY' | 'COUNTDOWN' | 'SERVING' | 'IN_FLIGHT' | 'PERFECT' | 'GOOD' | 'MISS';

export type ControlMode = 'webcam' | 'keyboard';

export interface BallPhysics {
  active: boolean;
  state: 'held' | 'tossed' | 'flying' | 'bumping' | 'bouncing';
  t: number;
  startTime: number;
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinY: number;
  hitChecked: boolean;
}

export interface PlayerInput {
  x: number; // -1 (left) to 1 (right)
  isSquatting: boolean;
  handsTogether: boolean;
  isReceiving: boolean;
}
