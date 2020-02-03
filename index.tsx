import * as React from "react";
import * as ReactDOM from "react-dom";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.css"; // Import precompiled Bootstrap css
import "@fortawesome/fontawesome-free/css/all.css";
import { Solid } from "./engine/models/solid";
import { matrix, add, Matrix } from "mathjs";
import * as MathJs from "mathjs";
import { Pivot } from "./engine/models/pivot";
import { Matrix33 } from "./engine/models/matrix33";
import { Vector3 } from "./engine/models/vector3";
import { Engine } from "./engine/engine";
import { Solver } from "./engine/models/solver";
import { rotateVector, rotateVectorAlongZ } from "./utils/vector-utils";

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
const counterWeightInertia = (2 / 5) * constants.counterWeightMass * Math.pow(constants.counterweightRadius, 2);

const armInertia = MathJs.parse("armMass * ((lengthOfLongArm + lengthOfShortArm) ^ 2 + armWidth ^ 2) / 6");
const armInertiaValue = armInertia.compile().evaluate(constants);

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

var engine = new Engine({
  constraints: [armPivot, armCounterweightPivot],
  gravity: 9.8,
  solids: [arm, counterweight],
  timeStep: 0.1
});

engine.initialize();
engine.runOneStep();

class Visualizer extends React.Component {
  sub: number;
  componentDidMount() {
    this.sub = setInterval(() => this.runOneStep(), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.sub);
  }

  runOneStep() {
    engine.runOneStep();
    this.forceUpdate();
  }

  render() {
    return (
      <svg width="100" height="100">
        {engine.solids.map(s => (
          <rect transform={`rotate(${s.rotation.z * (180 / Math.PI)})`} x={s.position.x} y={-s.position.y} width={5} height={5} color="blue" />
        ))}
        {engine.constraints.map(c => (
          <circle
            x={c.object1.position.x + rotateVectorAlongZ(c.object1.rotation.z, c.object1Position).x}
            y={c.object1.position.y + rotateVectorAlongZ(c.object1.rotation.z, c.object1Position).y}
            width={5}
            height={5}
            color="red"
          />
        ))}
      </svg>
    );
  }
}

ReactDOM.render(<Visualizer />, document.getElementById("react-root"));

console.log(counterweight);
