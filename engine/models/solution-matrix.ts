import MathJs, { Matrix } from "mathjs";

export class SolutionMatrix {
  inner: MathJs.Matrix;
  constructor(size: number) {
    this.inner = MathJs.zeros(size, size) as Matrix;
  }

  set(row: number, column: number, value: number) {
    this.inner.subset(MathJs.index(row, column), value);
  }
}
