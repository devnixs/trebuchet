import { Constraint, ConstraintSettings } from "./constraint";
import { Matrix } from "mathjs";

interface PivotSettings extends ConstraintSettings {}

export class Pivot extends Constraint {

  constructor(settings: PivotSettings) {
    super(settings);
  }
}
