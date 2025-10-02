declare module "cwg" {
  export interface PositionObj {
    wordStr: string;
    xNum: number;
    yNum: number;
    isHorizon: boolean;
  }

  export interface CWGResult {
    positionObjArr: PositionObj[];
    ownerMap: (
      | {
          letter: string;
          vertical?: number;
          horizontal?: number;
        }
      | undefined
    )[][];
    width: number;
    height: number;
  }

  function CWG(words: string[]): CWGResult;
  export = CWG;
}
