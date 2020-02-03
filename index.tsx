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
//engine.runOneStep();

class Visualizer extends React.Component {
  sub: number;
  componentDidMount() {
    // this.sub = setInterval(() => this.runOneStep(), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.sub);
  }

  runOneStep() {
    engine.runOneStep();
    this.forceUpdate();
  }

  async runNTimes(n: number) {
    for (let i = 0; i < n; i++) {
      engine.runOneStep();
      this.forceUpdate();
      await new Promise(r => setTimeout(r, 0.1));
    }
  }

  uiMultiplier = 1;

  updatePointPositionToFitCanvas(pos: Vector3) {
    return new Vector3(pos.x, 20 - pos.y, pos.z).multiply(this.uiMultiplier);
  }

  render() {
    console.log(engine);


    return (
      <div>
        <button onClick={() => this.runOneStep()}>Next Step</button>
        <button onClick={() => this.runNTimes(5)}>Run 5 times</button>
        <div>
          <svg width="1000" height="500" viewBox="-20 0 40 20">
            {engine.constraints.map(c => {
              const posRelativeToObject = rotateVectorAlongZ(c.object1.rotation.z, c.object1Position);
              const pos = c.object1.position.add(posRelativeToObject);
              const UIPos = this.updatePointPositionToFitCanvas(pos);
              return <circle key={c.name} cx={UIPos.x} cy={UIPos.y} r="0.3" fill="#009999" />;
            })}
            <rect
              transform={`rotate(${-(arm.rotation.z + constants.initialAngle) * (180 / Math.PI)}, ${this.updatePointPositionToFitCanvas(arm.position).x}, ${this.updatePointPositionToFitCanvas(arm.position).y})`}
              x={this.updatePointPositionToFitCanvas(arm.position).x - (constants.lengthOfLongArm + constants.lengthOfShortArm) / 2}
              y={this.updatePointPositionToFitCanvas(arm.position).y - constants.armWidth / 2}
              width={constants.lengthOfLongArm + constants.lengthOfShortArm}
              height={constants.armWidth * this.uiMultiplier}
              fill="#555"
            />
            <circle
              transform={`rotate(${-(counterweight.rotation.z) * (180 / Math.PI)}, ${this.updatePointPositionToFitCanvas(counterweight.position).x}, ${this.updatePointPositionToFitCanvas(counterweight.position).y})`}
              cx={this.updatePointPositionToFitCanvas(counterweight.position).x}
              cy={this.updatePointPositionToFitCanvas(counterweight.position).y}
              r={constants.counterweightRadius}
              fill="#555"
            />
            {engine.solids.map(s => (
              <text
                font-size="0.04rem"
                key={s.name + "text"}
                transform={`rotate(${-(s.rotation.z) * (180 / Math.PI)}, ${this.updatePointPositionToFitCanvas(s.position).x}, ${this.updatePointPositionToFitCanvas(s.position).y})`}
                x={this.updatePointPositionToFitCanvas(s.position).x}
                y={this.updatePointPositionToFitCanvas(s.position).y}
                textAnchor="middle"
                fill="#ccc"
              >
                {s.name}
              </text>
            ))}
          </svg>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<Visualizer />, document.getElementById("react-root"));

console.log(counterweight);
