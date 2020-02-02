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
  constructor(settings: ConstraintSettings) {
    this.name = settings.name;
  }

  toString() {
    return this.name;
  }
}
