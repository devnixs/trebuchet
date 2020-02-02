import { Matrix } from "mathjs";
import MathJs from "mathjs";

export function rotateVectorAlongZ(angle: number, vector: Matrix) {
  const rotationMatrix = MathJs.matrix([
    [Math.cos(angle), -Math.sin(angle), 0],
    [Math.sin(angle), Math.cos(angle), 0],
    [0, 0, 1]
  ]);
  return rotateVector(rotationMatrix, vector);
}

export function rotateVector(rotationMatrix: Matrix, vector: Matrix) {
  return MathJs.multiply(rotationMatrix, vector);
}
