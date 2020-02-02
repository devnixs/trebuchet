import { Matrix } from "mathjs";
import { Solid } from "./solid";

export interface ConstraintSettings {
  name: string;
  object1: Solid;
  object2?: Solid;

  object1Position: Matrix;
  object2Position?: Matrix;
}

export class Constraint {
  name: string;

  forceAppliedToFirstObject: Matrix;
  torqueAppliedToFirstObject: Matrix;
  object1: Solid;
  object1Position: Matrix;
  object2?: Solid;
  object2Position?: Matrix;

  constructor(settings: ConstraintSettings) {
    this.name = settings.name;
    this.object1 = settings.object1;
    this.object2 = settings.object2;
    this.object1Position = settings.object1Position;
    this.object2Position = settings.object2Position;
  }

  toString() {
    return this.name;
  }
}
