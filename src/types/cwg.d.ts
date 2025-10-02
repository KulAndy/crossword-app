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
          horizontal?: number;
          letter: string;
          vertical?: number;
        }
      | undefined
    )[][];
    positionObjArr: PositionObject[];
    width: number;
  }

  function CWG(words: string[]): CWGResult;
  export = CWG;
}
