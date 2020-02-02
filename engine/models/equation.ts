import { Constraint } from "./constraint";
import { Solid } from "./solid";

export type UnkownFactor = "d²x/dt" | "d²y/dt" | "d²w/dt" | "xforce" | "yforce";

export interface EquationTerm {
  unknownFactor: UnkownFactor;
  element: Solid | Constraint;
  value: number;
}

export interface Equation {
  terms: EquationTerm[];
  rightSide: number;
}
