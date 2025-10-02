declare module "cwg" {
  export interface PositionObject {
    isHorizon: boolean;
    wordStr: string;
    xNum: number;
    yNum: number;
  }

  export interface CWGResult {
    height: number;
    ownerMap: (
      | {
          h: number;
          hIdx: number;
          horizontal?: number;
          letter: string;
          v: number;
          vertical?: number;
          vIdx: number;
        }
      | undefined
    )[][];
    positionObjArr: PositionObject[];
    width: number;
  }

  function CWG(words: string[]): CWGResult;
  export = CWG;
}
