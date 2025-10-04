import type { PositionObject } from "./PositionObject";

export interface CWGResult {
  height: number;
  ownerMap: (
    | {
        horizontal?: number;
        letter: string;
        vertical?: number;
      }
    | undefined
  )[][];
  positionObjArr: PositionObject[];
  width: number;
}
