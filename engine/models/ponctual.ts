import { Constraint, ConstraintSettings } from "./constraint";
import { Vector3 } from "./vector3";

interface PonctualSettings extends ConstraintSettings {
  isAlongX: boolean;
}

export class Ponctual extends Constraint {
  isAlongX: boolean;
  constructor(settings: PonctualSettings) {
    super(settings);
    this.isAlongX = settings.isAlongX;
  }
}
