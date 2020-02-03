export class Vector3 {
  constructor(public x: number, public y: number, public z: number) {}

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

  toString() {
    return `${this.x}, ${this.y}, ${this.z}`;
  }
}
