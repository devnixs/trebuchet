import { Solid } from "./solid";
import { Constraint } from "./constraint";

export interface ChainOfSolid {
  parent?: ChainOfSolid;
  element: Solid;
  parentConstraint: Constraint;
}
