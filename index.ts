import "bootstrap";
import "bootstrap/dist/css/bootstrap.css"; // Import precompiled Bootstrap css
import "@fortawesome/fontawesome-free/css/all.css";
import { Solid } from "./engine/models/solid";
import { matrix, add, Matrix } from "mathjs";
import * as MathJs from "mathjs";
import { Pivot } from "./engine/models/constraint";

console.log("hello world");
const constants = {
  lengthOfShortArm: 1.75,
  lengthOfLongArm: 7,
  initialAngle: Math.PI / 4,
  heightOfPivot: 5,
  counterWeightMass: 100,
  counterweightRadius: 0.5,
  counterWeightLength: 2,
  armMass: 10,
  armWidth: 0.3
};
const counterWeightInertia = MathJs.parse(
  "(2/5) * counterWeightMass * counterweightRadius ^ 2"
);
const counterWeightInertiaValue = counterWeightInertia
  .compile()
  .evaluate(constants);

const armInertia = MathJs.parse(
  "armMass * ((lengthOfLongArm + lengthOfShortArm) ^ 2 + armWidth ^ 2) / 6"
);
const armInertiaValue = armInertia.compile().evaluate(constants);

var counterweight = new Solid({
  name: "Counterweight",
  initialPosition: MathJs.parse(
    "[0; heightOfPivot; 0] + " +
      " [lengthOfShortArm * cos(initialAngle); lengthOfShortArm * sin(initialAngle); 0] +" +
      " [0; - counterWeightLength; 0]"
  )
    .compile()
    .evaluate(constants) as Matrix,
  inertia: matrix([
    [counterWeightInertiaValue, 0, 0],
    [0, counterWeightInertiaValue, 0],
    [0, 0, counterWeightInertiaValue]
  ]),
  mass: constants.counterWeightMass
});

var arm = new Solid({
  name: "Arm",
  initialPosition: MathJs.parse(
    "[0; heightOfPivot; 0] +" +
      " [-((lengthOfLongArm + lengthOfShortArm) / 2 - lengthOfShortArm) * Math.cos(initialAngle);" +
      "  -((lengthOfLongArm + lengthOfShortArm) / 2 - lengthOfShortArm) * Math.sin(initialAngle);" +
      "  0]"
  )
    .compile()
    .evaluate(constants) as Matrix,
  inertia: matrix([
    [armInertiaValue, 0, 0],
    [0, armInertiaValue, 0],
    [0, 0, armInertiaValue]
  ]),
  mass: constants.armMass
});

var armPivot = new Pivot({
  name: "Arm to floor pivot",
  object1: arm,
  object1Position: MathJs.parse(
    " [((lengthOfLongArm + lengthOfShortArm) / 2 - lengthOfShortArm) * Math.cos(initialAngle);" +
      "  ((lengthOfLongArm + lengthOfShortArm) / 2 - lengthOfShortArm) * Math.sin(initialAngle);" +
      "  0]"
  )
    .compile()
    .evaluate(constants) as Matrix
});

var armCounterweightPivot = new Pivot({
  name: "Arm to counterweight pivot",
  object1: arm,
  object1Position: MathJs.parse(
    " [((lengthOfLongArm + lengthOfShortArm) / 2) * Math.cos(initialAngle);" +
      "  ((lengthOfLongArm + lengthOfShortArm) / 2) * Math.sin(initialAngle);" +
      "  0]"
  )
    .compile()
    .evaluate(constants) as Matrix,
  object2: counterweight,
  object2Position: MathJs.parse(" [0; counterWeightLength; 0]")
    .compile()
    .evaluate(constants) as Matrix
});



console.log(counterweight);
