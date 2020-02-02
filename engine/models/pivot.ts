import { Constraint, ConstraintSettings } from "./constraint";

interface PivotSettings extends ConstraintSettings {}

export class Pivot extends Constraint {
  constructor(settings: PivotSettings) {
    super(settings);
  }
}
