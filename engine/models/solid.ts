import { Matrix } from "mathjs";
import { Constraint } from "./constraint";
import { Matrix33 } from "./matrix33";
import { Vector3 } from "./vector3";

interface SolidSettings {
  name: string;
  initialPosition: Vector3;
  inertia: Matrix33;
  mass: number;
}

export class Solid {
  constructor(settings: SolidSettings) {
    this.rotation = Vector3.zero();
    this.rotationalSpeed = Vector3.zero();
    this.speed = Vector3.zero();
    this.acceleration = Vector3.zero();
    this.rotationalAcceleration = Vector3.zero();

    this.position = settings.initialPosition;
    this.inertia = settings.inertia;
    this.mass = settings.mass;
    this.name = settings.name;
  }
  inertia: Matrix33;
  mass: number;
  name: string;
  position: Vector3;
  rotation: Vector3;

  speed: Vector3;
  rotationalSpeed: Vector3;

  acceleration: Vector3;
  rotationalAcceleration: Vector3;

  toString() {
    return this.name;
  }
}
