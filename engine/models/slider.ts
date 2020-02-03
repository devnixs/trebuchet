import { Constraint, ConstraintSettings } from "./constraint";
import { Vector3 } from "./vector3";

interface PonctualSettings extends ConstraintSettings {
  axisInrelationToObject2: Vector3;
}

export class Slider extends Constraint {
  axisInrelationToObject2: Vector3;
  constructor(settings: PonctualSettings) {
    super(settings);
    this.axisInrelationToObject2 = settings.axisInrelationToObject2;
  }
}
