import { Matrix } from "mathjs";
import { Constraint } from "./constraint";

interface SolidSettings {
  name: string;
  initialPosition: Matrix;
  inertia: Matrix;
  mass: number;
}

export class Solid {
  constructor(settings: SolidSettings) {
    this.position = settings.initialPosition;
    this.inertia = settings.inertia;
    this.mass = settings.mass;
    this.name = settings.name;
  }
  inertia: Matrix;
  mass: number;
  name: string;
  position: Matrix;
  rotation: Matrix;

  speed: Matrix;
  rotationalSpeed: Matrix;

  acceleration: Matrix;
  rotationalAcceleration: Matrix;

  toString() {
    return this.name;
  }
}
