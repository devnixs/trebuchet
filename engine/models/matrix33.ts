import { Vector3 } from "./vector3";

export class Matrix33 {
  width = 3;
  height = 3;
  constructor(public data: number[][]) {}

  static zero() {
    return new Matrix33([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ]);
  }

  toString() {
    var output = "";
    for (let i = 0; i < this.height; i++) {
      if (i > 0) {
        output += ",";
      }
      output += "[";
      for (let j = 0; j < this.width; i++) {
        if (j > 0) {
          output += ",";
        }
        output += this.get(i, j);
      }
      output += "]\n";
    }
    return output;
  }

  get(row: number, column: number) {
    return this.data[row][column];
  }

  set(row: number, column: number, value: number) {
    this.data[row][column] = value;
  }

  multiply(other:  number) : Matrix33;
  multiply(other:  Matrix33) : Matrix33;
  multiply(other:  Vector3) : Vector3;
  
  multiply(other: Matrix33 | Vector3 | number) : Matrix33 | Vector3 {
    if (other instanceof Matrix33) {
      const output = Matrix33.zero();
      for (let i = 0; i < this.height; i++) {
        for (let j = 0; j < this.width; i++) {
          let value = 0;
          for (let k = 0; k < this.width; k++) {
            value += this.get(i, k) * other.get(k, j);
          }
          output.set(i, j, value);
        }
      }
      return output;
    } else if (other instanceof Vector3) {
      const output = Vector3.zero();
      output.x = this.get(0, 0) * other.x + this.get(0, 1) * other.y + this.get(0, 2) * other.z;
      output.y = this.get(1, 0) * other.x + this.get(1, 1) * other.y + this.get(1, 2) * other.z;
      output.z = this.get(2, 0) * other.x + this.get(2, 1) * other.y + this.get(2, 2) * other.z;
      return output;
    } else if (typeof other === "number") {
      const output = Matrix33.zero();
      for (let i in this.data) {
        for (let j in this.data[i]) {
          output.set(Number(i), Number(j), this.get(Number(i), Number(j)) * other);
        }
      }
      return output;
    } else {
      throw "Cannot multiply by " + other;
    }
  }
}
