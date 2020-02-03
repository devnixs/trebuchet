import { Engine } from "../engine/engine";
import { Vector3 } from "../engine/models/vector3";
import { Slider } from "../engine/models/slider";
import { Pivot } from "../engine/models/pivot";
import { Solid } from "../engine/models/solid";
import { Matrix33 } from "../engine/models/matrix33";

export interface TrebuchetSettings {
  lengthOfShortArm: number;
  lengthOfLongArm: number;
  initialAngle: number;
  heightOfPivot: number;
  counterWeightMass: number;
  counterweightRadius: number;
  counterWeightLength: number;
  armMass: number;
  armWidth: number;
  projectileMass: number;
  projectileRadius: number;
  slingLength: number;
}

export interface TrebuchetObjects {
  counterweight: Solid;
  arm: Solid;
  projectile: Solid;
  armPivot: Pivot;
  armCounterweightPivot: Pivot;
  armProjectilePivot: Pivot;
  projectileToGround: Slider;
}

export function getTrebuchetObjects(constants: TrebuchetSettings): TrebuchetObjects {
  const counterWeightInertia = (2 / 5) * constants.counterWeightMass * Math.pow(constants.counterweightRadius, 2);
  const projectileInertia = (2 / 5) * constants.projectileMass * Math.pow(constants.projectileRadius, 2);

  const armInertiaValue = (constants.armMass * (Math.pow(constants.lengthOfLongArm + constants.lengthOfShortArm, 2) ^ 2)) / 12;
  console.log("armInertiaValue", armInertiaValue);
  console.log("projectileInertia", projectileInertia);
  console.log("counterWeightInertia", counterWeightInertia);

  var counterweight = new Solid({
    name: "Counterweight",
    initialPosition: new Vector3(0, constants.heightOfPivot, 0)
      .add(new Vector3(constants.lengthOfShortArm * Math.cos(constants.initialAngle), constants.lengthOfShortArm * Math.sin(constants.initialAngle), 0))
      .add(new Vector3(0, -constants.counterWeightLength, 0)),

    inertia: new Matrix33([
      [counterWeightInertia, 0, 0],
      [0, counterWeightInertia, 0],
      [0, 0, counterWeightInertia]
    ]),
    mass: constants.counterWeightMass
  });

  var arm = new Solid({
    name: "Arm",
    initialPosition: new Vector3(0, constants.heightOfPivot, 0).add(
      new Vector3(
        -((constants.lengthOfLongArm + constants.lengthOfShortArm) / 2 - constants.lengthOfShortArm) * Math.cos(constants.initialAngle),
        -((constants.lengthOfLongArm + constants.lengthOfShortArm) / 2 - constants.lengthOfShortArm) * Math.sin(constants.initialAngle),
        0
      )
    ),
    inertia: new Matrix33([
      [armInertiaValue, 0, 0],
      [0, armInertiaValue, 0],
      [0, 0, armInertiaValue]
    ]),
    mass: constants.armMass
  });

  const tipOfArm = new Vector3(
    -constants.lengthOfLongArm * Math.cos(constants.initialAngle),
    -constants.lengthOfLongArm * Math.cos(constants.initialAngle) + constants.heightOfPivot,
    0
  );

  var projectile = new Solid({
    name: "Projectile",
    initialPosition: new Vector3(Math.sqrt(Math.pow(constants.slingLength, 2) - Math.pow(tipOfArm.y, 2)) + tipOfArm.x, 0, 0),
    inertia: new Matrix33([
      [projectileInertia, 0, 0],
      [0, projectileInertia, 0],
      [0, 0, projectileInertia]
    ]),
    mass: constants.projectileMass
  });

  var armPivot = new Pivot({
    name: "Arm to floor pivot",
    object1: arm,
    object1Position: new Vector3(
      ((constants.lengthOfLongArm + constants.lengthOfShortArm) / 2 - constants.lengthOfShortArm) * Math.cos(constants.initialAngle),
      ((constants.lengthOfLongArm + constants.lengthOfShortArm) / 2 - constants.lengthOfShortArm) * Math.sin(constants.initialAngle),
      0
    )
  });

  var armCounterweightPivot = new Pivot({
    name: "Arm to counterweight pivot",
    object1: arm,
    object1Position: new Vector3(
      ((constants.lengthOfLongArm + constants.lengthOfShortArm) / 2) * Math.cos(constants.initialAngle),
      ((constants.lengthOfLongArm + constants.lengthOfShortArm) / 2) * Math.sin(constants.initialAngle),
      0
    ),
    object2: counterweight,
    object2Position: new Vector3(0, constants.counterWeightLength, 0)
  });

  var armProjectilePivot = new Pivot({
    name: "Arm to projectile pivot",
    object1: arm,
    object1Position: new Vector3(
      -((constants.lengthOfLongArm + constants.lengthOfShortArm) / 2) * Math.cos(constants.initialAngle),
      -((constants.lengthOfLongArm + constants.lengthOfShortArm) / 2) * Math.sin(constants.initialAngle),
      0
    ),
    object2: projectile,
    object2Position: tipOfArm.subtract(projectile.position)
  });

  var projectileToGround = new Slider({
    name: "Projectile to ground",
    object1: projectile,
    object1Position: new Vector3(0, 0, 0),
    axisInrelationToObject2: new Vector3(1, 0, 0)
  });

  return {
    counterweight,
    arm,
    projectile,
    armPivot,
    armCounterweightPivot,
    armProjectilePivot,
    projectileToGround
  };
}

export const objects = {};
