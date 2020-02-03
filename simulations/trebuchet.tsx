import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.css"; // Import precompiled Bootstrap css
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Engine } from "../engine/engine";
import { Matrix33 } from "../engine/models/matrix33";
import { Pivot } from "../engine/models/pivot";
import { Solid } from "../engine/models/solid";
import { Vector3 } from "../engine/models/vector3";
import { rotateVectorAlongZ } from "../utils/vector-utils";

const constants = {
  lengthOfShortArm: 1.75,
  lengthOfLongArm: 6.79,
  initialAngle: Math.PI / 4,
  heightOfPivot: 5,
  counterWeightMass: 98,
  counterweightRadius: 0.5,
  counterWeightLength: 2,
  armMass: 10.65,
  armWidth: 0.3,
  projectileMass: 4,
  projectileRadius: 0.076,
  slingLength: 6.8
};
const counterWeightInertia = (2 / 5) * constants.counterWeightMass * Math.pow(constants.counterweightRadius, 2);
const projectileInertia = (2 / 5) * constants.projectileMass * Math.pow(constants.projectileRadius, 2);

const armInertiaValue = (constants.armMass * ((Math.pow(constants.lengthOfLongArm + constants.lengthOfShortArm, 2) + constants.armWidth) ^ 2)) / 6;

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
  initialPosition: new Vector3(Math.sqrt(Math.pow(constants.slingLength, 2) - Math.pow(tipOfArm.y, 2)), 0, 0),
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

var engine = new Engine({
  constraints: [armPivot, armCounterweightPivot, armProjectilePivot],
  gravity: 9.8,
  solids: [arm, counterweight, projectile],
  timeStep: 0.05,
  energyDissipationCoefficient: 0 // 0.05
});

engine.initialize();

interface VizualizerState {
  showSpeeds: boolean;
  showAccelerations: boolean;
  speed: number;
  stopAtAngle?: number;
}

class Visualizer extends React.Component<{}, VizualizerState> {
  sub: number;
  play: boolean;
  fps: number;

  constructor(props) {
    super(props);
    this.state = {
      showAccelerations: false,
      showSpeeds: true,
      speed: 0.2
      // stopAtAngle: (45 * Math.PI) / 180
    };
  }

  viewStart = [-20, -5];
  viewEnd = [20, 30];

  componentDidMount() {
    // this.sub = setInterval(() => this.runOneStep(), 1000);
    document.onkeyup = this.onKeyUp;
  }

  componentWillUnmount() {
    clearInterval(this.sub);

    document.onkeyup = undefined;
  }

  runOneStep() {
    engine.runOneStep();
    this.forceUpdate();
  }

  async run() {
    this.play = true;
    window.requestAnimationFrame(this.step);
  }

  start: Date | null = null;
  step = () => {
    const ellapsed = this.start ? new Date().getTime() - this.start.getTime() : undefined;
    this.start = new Date();
    this.fps = 1000 / ellapsed;
    engine.runOneStep((this.state.speed * ellapsed) / 1000);

    if (this.state.stopAtAngle) {
      const angle = projectile.speed.angle();
      if (angle < this.state.stopAtAngle) {
        this.play = false;
      }
    }
    this.forceUpdate();

    if (this.play) {
      window.requestAnimationFrame(this.step);
    }
  };

  updatePointPositionToFitCanvas(pos: Vector3) {
    return new Vector3(pos.x, this.viewEnd[1] - pos.y, pos.z);
  }

  onKeyUp = (e: KeyboardEvent) => {
    if (e.which == 65) {
      engine.runOneStep();
      this.forceUpdate();
    }
  };

  reset(){
    engine.reset();
    this.forceUpdate();
  }

  render() {
    return (
      <div>
        <button className="btn btn-danger" onClick={() => this.reset()}>Reset</button>
        <button className="btn btn-info" onClick={() => this.runOneStep()}>Next Step</button>
        {!this.play ? <button className="btn btn-primary" onClick={() => this.run()}>Play</button> : <button className="btn btn-warning" onClick={() => (this.play = false)}>Stop</button>}
        <div>
          <svg style={{width: '100vw', height:'calc(100vh - 50px)'}} viewBox={`${this.viewStart[0]} ${0} ${this.viewEnd[0] - this.viewStart[0]} ${this.viewEnd[1] - this.viewStart[1]}`}>
            <text fontSize="0.04rem" x={0} y={1} textAnchor="start" fill="#ccc">
              Ellapsed {engine.time.toFixed(2)}s
            </text>
            <text fontSize="0.04rem" x={0} y={2} textAnchor="start" fill="#ccc">
              Projectile Velocity {projectile.speed.norm().toFixed(2)}m/s
            </text>
            {projectile.speed.norm() > 0 && (
              <text fontSize="0.04rem" x={-20} y={2} textAnchor="start" fill="#ccc">
                Projectile Angle {((projectile.speed.angle() * 180) / Math.PI).toFixed(2)}°
              </text>
            )}
            {this.fps > 0 && (
              <text fontSize="0.04rem" x={-20} y={1} textAnchor="start" fill="#ccc">
                {Math.ceil(this.fps)} FPS
              </text>
            )}
            {engine.constraints.map(c => {
              const posRelativeToObject = rotateVectorAlongZ(c.object1.rotation.z, c.object1Position);
              const pos = c.object1.position.add(posRelativeToObject);
              const UIPos = this.updatePointPositionToFitCanvas(pos);
              return <circle key={c.name} cx={UIPos.x} cy={UIPos.y} r="0.3" fill="#009999" />;
            })}
            <rect
              transform={`rotate(${-(arm.rotation.z + constants.initialAngle) * (180 / Math.PI)}, ${this.updatePointPositionToFitCanvas(arm.position).x}, ${
                this.updatePointPositionToFitCanvas(arm.position).y
              })`}
              x={this.updatePointPositionToFitCanvas(arm.position).x - (constants.lengthOfLongArm + constants.lengthOfShortArm) / 2}
              y={this.updatePointPositionToFitCanvas(arm.position).y - constants.armWidth / 2}
              width={constants.lengthOfLongArm + constants.lengthOfShortArm}
              height={constants.armWidth}
              fill="#555"
            />
            <circle
              transform={`rotate(${-counterweight.rotation.z * (180 / Math.PI)}, ${this.updatePointPositionToFitCanvas(counterweight.position).x}, ${
                this.updatePointPositionToFitCanvas(counterweight.position).y
              })`}
              cx={this.updatePointPositionToFitCanvas(counterweight.position).x}
              cy={this.updatePointPositionToFitCanvas(counterweight.position).y}
              r={constants.counterweightRadius}
              fill="#555"
            />
            <line
              x1={this.updatePointPositionToFitCanvas(projectile.position).x}
              y1={this.updatePointPositionToFitCanvas(projectile.position).y}
              x2={
                this.updatePointPositionToFitCanvas(
                  rotateVectorAlongZ(armProjectilePivot.object1.rotation.z, armProjectilePivot.object1Position).add(armProjectilePivot.object1.position)
                ).x
              }
              y2={
                this.updatePointPositionToFitCanvas(
                  rotateVectorAlongZ(armProjectilePivot.object1.rotation.z, armProjectilePivot.object1Position).add(armProjectilePivot.object1.position)
                ).y
              }
              stroke="#222"
              strokeWidth="0.2"
            />
            <line
              x1={this.updatePointPositionToFitCanvas(new Vector3(0, 0, 0)).x}
              y1={this.updatePointPositionToFitCanvas(new Vector3(0, 0, 0)).y}
              x2={this.updatePointPositionToFitCanvas(new Vector3(0, 0, 0)).x}
              y2={
                this.updatePointPositionToFitCanvas(rotateVectorAlongZ(armPivot.object1.rotation.z, armPivot.object1Position).add(armPivot.object1.position)).y
              }
              stroke="#009999"
              strokeWidth="0.2"
            />
            <line
              x1={this.updatePointPositionToFitCanvas(counterweight.position).x}
              y1={this.updatePointPositionToFitCanvas(counterweight.position).y}
              x2={
                this.updatePointPositionToFitCanvas(
                  rotateVectorAlongZ(armCounterweightPivot.object1.rotation.z, armCounterweightPivot.object1Position).add(
                    armCounterweightPivot.object1.position
                  )
                ).x
              }
              y2={
                this.updatePointPositionToFitCanvas(
                  rotateVectorAlongZ(armCounterweightPivot.object1.rotation.z, armCounterweightPivot.object1Position).add(
                    armCounterweightPivot.object1.position
                  )
                ).y
              }
              stroke="#222"
              strokeWidth="0.2"
            />
            <circle
              transform={`rotate(${-projectile.rotation.z * (180 / Math.PI)}, ${this.updatePointPositionToFitCanvas(projectile.position).x}, ${
                this.updatePointPositionToFitCanvas(projectile.position).y
              })`}
              cx={this.updatePointPositionToFitCanvas(projectile.position).x}
              cy={this.updatePointPositionToFitCanvas(projectile.position).y}
              r={constants.projectileRadius * 5}
              fill="#FFF"
            />
            {engine.solids.map(s => (
              <text
                fontSize="0.04rem"
                key={s.name + "text"}
                transform={`rotate(${-s.rotation.z * (180 / Math.PI)}, ${this.updatePointPositionToFitCanvas(s.position).x}, ${
                  this.updatePointPositionToFitCanvas(s.position).y
                })`}
                x={this.updatePointPositionToFitCanvas(s.position).x}
                y={this.updatePointPositionToFitCanvas(s.position).y}
                textAnchor="middle"
                fill="#ccc"
              >
                {s.name}
              </text>
            ))}
            {this.state.showSpeeds &&
              engine.solids.map(s => {
                const speedEnd = s.position.add(s.speed.multiply(0.3));
                return (
                  <line
                    key={s.name + "-speed"}
                    x1={this.updatePointPositionToFitCanvas(s.position).x + 0.1}
                    y1={this.updatePointPositionToFitCanvas(s.position).y}
                    x2={this.updatePointPositionToFitCanvas(speedEnd).x + 0.1}
                    y2={this.updatePointPositionToFitCanvas(speedEnd).y}
                    stroke="#992222"
                    strokeWidth="0.1"
                  />
                );
              })}
            {this.state.showAccelerations &&
              engine.solids.map(s => {
                const speedEnd = s.position.add(s.acceleration.multiply(0.2));
                return (
                  <line
                    key={s.name + "-acceleration"}
                    x1={this.updatePointPositionToFitCanvas(s.position).x}
                    y1={this.updatePointPositionToFitCanvas(s.position).y}
                    x2={this.updatePointPositionToFitCanvas(speedEnd).x}
                    y2={this.updatePointPositionToFitCanvas(speedEnd).y}
                    stroke="#222299"
                    strokeWidth="0.1"
                  />
                );
              })}
          </svg>
        </div>
      </div>
    );
  }
}

export const Trebuchet = Visualizer;