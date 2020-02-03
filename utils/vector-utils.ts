import { Vector3 } from "../engine/models/vector3";
import { Matrix33 } from "../engine/models/matrix33";

export function rotateVectorAlongZ(angle: number, vector: Vector3) {
  const rotationMatrix = new Matrix33([
    [Math.cos(angle), -Math.sin(angle), 0],
    [Math.sin(angle), Math.cos(angle), 0],
    [0, 0, 1]
  ]);
  return rotateVector(rotationMatrix, vector);
}

export function rotateVectorAlongVector(angleMatrix: Vector3, vector: Vector3) {
  const angle = angleMatrix.z;
  // we only support Z axis rotation for now
  const rotationMatrix = new Matrix33([
    [Math.cos(angle), -Math.sin(angle), 0],
    [Math.sin(angle), Math.cos(angle), 0],
    [0, 0, 1]
  ]);
  return rotateVector(rotationMatrix, vector);
}

export function rotateVector(rotationMatrix: Matrix33, vector: Vector3) {
  return rotationMatrix.multiply(vector);
}
