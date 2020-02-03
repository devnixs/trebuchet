import { Matrix } from "mathjs";
import { Solid } from "./solid";
import { Vector3 } from "./vector3";

export interface ConstraintSettings {
  name: string;
  object1: Solid;
  object2?: Solid;

  object1Position: Vector3;
  object2Position?: Vector3;
}

export class Constraint {
  name: string;

  forceAppliedToFirstObject: Vector3;
  torqueAppliedToFirstObject: Vector3;
  object1: Solid;
  object1Position: Vector3;
  object2?: Solid;
  object2Position?: Vector3;

  constructor(settings: ConstraintSettings) {
    this.name = settings.name;
    this.object1 = settings.object1;
    this.object2 = settings.object2;
    this.object1Position = settings.object1Position;
    this.object2Position = settings.object2Position;

    this.forceAppliedToFirstObject = Vector3.zero();
    this.torqueAppliedToFirstObject = Vector3.zero();
  }

  toString() {
    return this.name;
  }
}
