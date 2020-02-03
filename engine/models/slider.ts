import { Constraint, ConstraintSettings } from "./constraint";
import { Vector3 } from "./vector3";

interface PonctualSettings extends ConstraintSettings {
  axisInrelationToObject2: Vector3;
}

export class Slider extends Constraint {
  axisInrelationToObject2: Vector3;
  constructor(settings: PonctualSettings) {
    super(settings);
    if (settings.axisInrelationToObject2.norm() === 0) {
      throw new Error("Norm of the slider axis named " + settings.name + " must be positive");
    }
    this.axisInrelationToObject2 = settings.axisInrelationToObject2;
  }
}
