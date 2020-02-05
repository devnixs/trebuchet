import * as MathJs from "mathjs";
import { matrix_invert } from "../utils/invert-matrix";

function getExampleMatrix() {
  var matrix1 = [];
  const size = 3;
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) {
      if (i === j) {
        row.push(i * size + j * size);
      } else {
        row.push(i * size + j);
      }
    }
    matrix1.push(row);
  }
  return matrix1;
}

export function runMatrixBenchmark() {
  const runCount = 1000;
  const matrix = getExampleMatrix();
  console.log("matrix: ", matrix);
  computeInversionWithMathJs(matrix, runCount);
  computeInversionWithHomemadeScript(matrix, runCount);
}

export function computeInversionWithMathJs(matrix: number[][], count: number) {
  const time = new Date();
  for (let i = 0; i < count; i++) {
    var mat = MathJs.matrix(matrix);
    var result = MathJs.inv(mat);
    var id = MathJs.multiply(result, mat);
  }
  console.log("MathJs:", result);
  console.log("MathJs:", id);
  const ellapsed = new Date().getTime() - time.getTime();
  console.log("Ellapsed:", ellapsed);
}

export function computeInversionWithHomemadeScript(matrix: number[][], count: number) {
  const time = new Date();
  for (let i = 0; i < count; i++) {
    var result = matrix_invert(matrix);
  }
  console.log("Custom:", result);
  const ellapsed = new Date().getTime() - time.getTime();
  console.log("Ellapsed:", ellapsed);
}