import { Constraint } from "./constraint";
import { Solid } from "./solid";

export type UnkownFactor = "d²x/dt" | "d²y/dt" | "d²w/dt" | "xforce" | "yforce" | "ztorque" | "none";

export interface EquationTerm {
  unknownFactor: UnkownFactor;
  element: Solid | Constraint | null;
  value: number;
}

export interface Solution {
  unknown: UnkownFactor;
  element: Solid | Constraint | null;
  value: number;
}

export interface Equation {
  terms: EquationTerm[];
}

export function multiplySolution(s: Solution[], amount: number) {
  return s.map(i => ({ unknown: i.unknown, element: i.element, value: i.value * amount } as Solution));
}

export function addSolution(s1: Solution[], s2: Solution[]) {
  if (s1.length != s2.length) {
    throw new Error("Different solution sizes!");
  }
  return s1.map(i1 => {
    const other = s2.find(i2 => i1.element === i2.element && i1.unknown === i2.unknown);
    if (!other) {
      throw new Error(`Could not find solution ${i1.unknown} ${i1.element.name}`);
    }
    return { unknown: i1.unknown, element: i1.element, value: i1.value + other.value } as Solution;
  });
}
