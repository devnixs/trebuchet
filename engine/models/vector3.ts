import { rotateVectorAlongVector } from "../../utils/vector-utils";

export class Vector3 {
  constructor(public readonly x: number, public readonly y: number, public readonly z: number) {}

  dot(other: Vector3) {
    return other.x * this.x + other.y * this.y + other.z * this.z;
  }

  cross(other: Vector3) {
    return new Vector3(this.y * other.z - this.z * other.y, other.x * this.z - this.x * other.z, this.x * other.y - this.y * other.x);
  }
  /* 
  multiply(other: Matrix33){
      return 
  }
 */
  static zero() {
    return new Vector3(0, 0, 0);
  }

  add(other: Vector3) {
    return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  subtract(other: Vector3) {
    return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  multiply(other: number) {
    return new Vector3(this.x * other, this.y * other, this.z * other);
  }

  norm() {
    return Math.sqrt(this.dot(this));
  }

  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  normalize() {
    const norm = this.norm();
    return new Vector3(this.x / norm, this.y / norm, this.z / norm);
  }

  rotate(rotation: Vector3) {
    return rotateVectorAlongVector(rotation, this);
  }

  angle() {
    if (this.x === 0) {
      return Math.PI / 2;
    } else {
      if (this.y > 0) {
        return Math.acos(this.x / this.norm());
      } else {
        return 2 * Math.PI - Math.acos(this.x / this.norm());
      }
    }
  }

  toString() {
    return `${this.x}, ${this.y}, ${this.z}`;
  }
}
