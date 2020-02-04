import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.css"; // Import precompiled Bootstrap css
import * as React from "react";
import { Engine } from "../engine/engine";
import { Vector3 } from "../engine/models/vector3";
import { rotateVectorAlongVector, rotateVectorAlongZ } from "../utils/vector-utils";
import { getTrebuchetObjects, TrebuchetObjects } from "./trebuchet-objects";
import lodash from "lodash";

const constants = {
  lengthOfShortArm: 1.75,
  lengthOfLongArm: 6.792,
  initialAngle: undefined, // computed so that the arm touches the ground
  heightOfPivot: 5,
  counterWeightMass: 98,
  counterweightRadius: 0.16,
  counterWeightLength: 2,
  armMass: 10.65,
  armWidth: 0.2,
  projectileMass: 0.149,
  projectileRadius: 0.076 / 2,
  slingLength: 6.79
};

interface VizualizerState {
  showSpeeds: boolean;
  showAccelerations: boolean;
  showForces: boolean;
  speed: number;
  releaseAngle?: number;
  pauseAfterRelease: boolean;
}

class Visualizer extends React.Component<{}, VizualizerState> {
  sub: number;
  play: boolean;
  fps: number;
  engine: Engine;
  objects: TrebuchetObjects;
  detached: boolean;
  releaseVelocity?: number;
  initialProjectileToGroundForce: number;

  constructor(props) {
    super(props);
    this.state = {
      showAccelerations: false,
      showSpeeds: true,
      showForces: false,
      pauseAfterRelease: true,
      speed: 1,
      releaseAngle: (45 * Math.PI) / 180
    };

    this.setup();
  }

  viewStart = [-10, -5];
  viewEnd = [20, 30];

  setup() {
    this.detached = false;
    this.releaseVelocity = undefined;

    this.objects = getTrebuchetObjects(constants);
    this.engine = new Engine({
      constraints: [this.objects.armPivot, this.objects.armCounterweightPivot, this.objects.armProjectilePivot, this.objects.projectileToGround],
      gravity: 9.8,
      solids: [this.objects.arm, this.objects.counterweight, this.objects.projectile],
      timeStep: 0.001,
      enableRungeKutta: false,
      energyDissipationCoefficient: 0 // 0.05
    });
    this.engine.initialize();
    this.engine.runOneStep({ dryRun: true });
    this.initialProjectileToGroundForce = this.objects.projectileToGround.forceAppliedToFirstObject.y;
  }

  computeViewBox() {
    const minX = lodash.min(this.engine.solids.map(i => i.position.x).concat(5));
    const minY = lodash.min(this.engine.solids.map(i => i.position.y).concat(5));
    const maxX = lodash.max(this.engine.solids.map(i => i.position.x).concat(10));
    const maxY = lodash.max(this.engine.solids.map(i => i.position.y).concat(20));

    this.viewStart = [minX - 10, minY - 10];
    this.viewEnd = [maxX + 10, maxY + 10];
  }

  componentDidMount() {
    document.onkeyup = this.onKeyUp;
  }

  componentWillUnmount() {
    clearInterval(this.sub);

    document.onkeyup = undefined;
  }

  runOneStep() {
    this.engine.runOneStep({});
    this.forceUpdate();
  }

  async run() {
    this.play = true;
    this.renderView();

    while (this.play) {
      const start = new Date();
      this.engine.runOneStep({});

      // break the slider if the force is almost zero
      if (this.objects.projectileToGround.forceAppliedToFirstObject.y <= this.initialProjectileToGroundForce / 10) {
        this.engine.removeConstraint(this.objects.projectileToGround);
      }

      if (this.state.releaseAngle && !this.detached) {
        const angle = this.objects.projectile.speed.angle();
        if (angle < this.state.releaseAngle) {
          this.detached = true;
          if (this.state.pauseAfterRelease) {
            this.play = false;
          }
          this.engine.removeConstraint(this.objects.armProjectilePivot);
          this.releaseVelocity = this.objects.projectile.speed.norm();
        }
      }
      this.lastComputationHasBeenRendered = false;

      const ellapsed = (new Date().getTime() - start.getTime()) / 1000;
      const waitDuration = Math.max(0, this.engine.timeStep / this.state.speed - ellapsed);
      this.fps = 1 / ellapsed;

      await new Promise(r => setTimeout(r, waitDuration * 1000));
    }
  }

  lastComputationHasBeenRendered: boolean;
  renderView = () => {
    if (!this.lastComputationHasBeenRendered) {
      this.forceUpdate();
      this.lastComputationHasBeenRendered = true;
    }
    if (this.play) {
      window.requestAnimationFrame(this.renderView);
    }
  };

  updatePointPositionToFitCanvas(pos: Vector3) {
    return new Vector3(pos.x, this.viewEnd[1] - pos.y, pos.z);
  }

  onKeyUp = (e: KeyboardEvent) => {
    if (e.which == 65) {
      this.engine.runOneStep({});
      this.forceUpdate();
    }
  };

  reset() {
    this.play = false;
    this.setup();
    this.forceUpdate();
  }

  render() {
    return (
      <div>
        <form className="form-inline">
          <button type="button" className="btn btn-danger" onClick={() => this.reset()}>
            Reset
          </button>
          <button type="button" className="btn btn-info" onClick={() => this.runOneStep()}>
            Next Step
          </button>
          {!this.play ? (
            <button type="button" className="btn btn-primary" onClick={() => this.run()}>
              Play
            </button>
          ) : (
            <button type="button" className="btn btn-warning" onClick={() => (this.play = false)}>
              Stop
            </button>
          )}
          <label className="ml-5" htmlFor="speed">
            Speed:
          </label>
          <input
            id="speed"
            type="range"
            min="1"
            max="20"
            value={this.state.speed * 10}
            onChange={e => this.setState({ speed: Number(e.target.value) / 10 })}
            className="form-control"
          ></input>
          x{this.state.speed}
          <div className="custom-control custom-checkbox mb-2 ml-5 mr-sm-2">
            <input
              className="custom-control-input"
              checked={this.state.pauseAfterRelease}
              onChange={e => this.setState({ pauseAfterRelease: e.target.checked })}
              type="checkbox"
              id="pauseAfterRelease"
            />
            <label className="custom-control-label" htmlFor="pauseAfterRelease">
              Pause after release
            </label>
          </div>
        </form>

        <div>
          <svg
            style={{ width: "100vw", height: "calc(100vh - 50px)" }}
            viewBox={`${this.viewStart[0]} ${0} ${this.viewEnd[0] - this.viewStart[0]} ${this.viewEnd[1] - this.viewStart[1]}`}
          >
            <text fontSize="0.04rem" x={0} y={1} textAnchor="start" fill="#ccc">
              Ellapsed {this.engine.time.toFixed(2)}s
            </text>
            <text fontSize="0.04rem" x={0} y={2} textAnchor="start" fill="#ccc">
              Projectile Velocity {this.objects.projectile.speed.norm().toFixed(2)}m/s
            </text>
            {this.objects.projectile.speed.norm() > 0 && (
              <text fontSize="0.04rem" x={-10} y={2} textAnchor="start" fill="#ccc">
                Projectile Angle {((this.objects.projectile.speed.angle() * 180) / Math.PI).toFixed(2)}°
              </text>
            )}
            {this.fps > 0 && (
              <text fontSize="0.04rem" x={-10} y={1} textAnchor="start" fill="#ccc">
                {Math.ceil(this.fps)} FPS
              </text>
            )}
            {this.releaseVelocity ? (
              <text fontSize="0.04rem" x={10} y={1.5} textAnchor="start" fontWeight="bold" fill="#fff">
                Release Velocity : {this.releaseVelocity.toFixed(2)} m/s
              </text>
            ) : null}
            {this.engine.constraints.map(c => {
              const posRelativeToObject = rotateVectorAlongZ(c.object1.rotation.z, c.object1Position);
              const pos = c.object1.position.add(posRelativeToObject);
              const UIPos = this.updatePointPositionToFitCanvas(pos);
              return <circle key={c.name} cx={UIPos.x} cy={UIPos.y} r="0.1" fill="#009999" />;
            })}
            {/* Arm */}
            <rect
              transform={`rotate(${-(this.objects.arm.rotation.z + constants.initialAngle) * (180 / Math.PI)}, ${
                this.updatePointPositionToFitCanvas(this.objects.arm.position).x
              }, ${this.updatePointPositionToFitCanvas(this.objects.arm.position).y})`}
              x={this.updatePointPositionToFitCanvas(this.objects.arm.position).x - (constants.lengthOfLongArm + constants.lengthOfShortArm) / 2}
              y={this.updatePointPositionToFitCanvas(this.objects.arm.position).y - constants.armWidth / 2}
              width={constants.lengthOfLongArm + constants.lengthOfShortArm}
              height={constants.armWidth}
              fill="#555"
            />
            {/* Trebuchet holding line */}
            <line
              x1={this.updatePointPositionToFitCanvas(new Vector3(0, 0, 0)).x}
              y1={this.updatePointPositionToFitCanvas(new Vector3(0, 0, 0)).y}
              x2={this.updatePointPositionToFitCanvas(new Vector3(0, 0, 0)).x}
              y2={
                this.updatePointPositionToFitCanvas(
                  rotateVectorAlongZ(this.objects.armPivot.object1.rotation.z, this.objects.armPivot.object1Position).add(
                    this.objects.armPivot.object1.position
                  )
                ).y
              }
              stroke="#BC6C25"
              strokeWidth="0.15"
            />
            <line
              x1={this.updatePointPositionToFitCanvas(new Vector3(-constants.heightOfPivot / 2, 0, 0)).x}
              y1={this.updatePointPositionToFitCanvas(new Vector3(-constants.heightOfPivot / 2, 0, 0)).y}
              x2={this.updatePointPositionToFitCanvas(new Vector3(constants.heightOfPivot / 2, 0, 0)).x}
              y2={this.updatePointPositionToFitCanvas(new Vector3(constants.heightOfPivot / 2, 0, 0)).y}
              stroke="#BC6C25"
              strokeWidth="0.15"
            />
            <line
              x1={this.updatePointPositionToFitCanvas(new Vector3(-constants.heightOfPivot / 3, 0, 0)).x}
              y1={this.updatePointPositionToFitCanvas(new Vector3(-constants.heightOfPivot / 3, 0, 0)).y}
              x2={this.updatePointPositionToFitCanvas(new Vector3(0, constants.heightOfPivot / 2, 0)).x}
              y2={this.updatePointPositionToFitCanvas(new Vector3(0, constants.heightOfPivot / 2, 0)).y}
              stroke="#BC6C25"
              strokeWidth="0.15"
            />
            <line
              x1={this.updatePointPositionToFitCanvas(new Vector3(constants.heightOfPivot / 3, 0, 0)).x}
              y1={this.updatePointPositionToFitCanvas(new Vector3(constants.heightOfPivot / 3, 0, 0)).y}
              x2={this.updatePointPositionToFitCanvas(new Vector3(0, constants.heightOfPivot / 2, 0)).x}
              y2={this.updatePointPositionToFitCanvas(new Vector3(0, constants.heightOfPivot / 2, 0)).y}
              stroke="#BC6C25"
              strokeWidth="0.15"
            />
            {/* Countweight */}
            <circle
              transform={`rotate(${-this.objects.counterweight.rotation.z * (180 / Math.PI)}, ${
                this.updatePointPositionToFitCanvas(this.objects.counterweight.position).x
              }, ${this.updatePointPositionToFitCanvas(this.objects.counterweight.position).y})`}
              cx={this.updatePointPositionToFitCanvas(this.objects.counterweight.position).x}
              cy={this.updatePointPositionToFitCanvas(this.objects.counterweight.position).y}
              r={constants.counterweightRadius * 3}
              fill="#555"
            />
            {/* Counterweight line */}
            <line
              x1={this.updatePointPositionToFitCanvas(this.objects.counterweight.position).x}
              y1={this.updatePointPositionToFitCanvas(this.objects.counterweight.position).y}
              x2={
                this.updatePointPositionToFitCanvas(
                  rotateVectorAlongZ(this.objects.armCounterweightPivot.object1.rotation.z, this.objects.armCounterweightPivot.object1Position).add(
                    this.objects.armCounterweightPivot.object1.position
                  )
                ).x
              }
              y2={
                this.updatePointPositionToFitCanvas(
                  rotateVectorAlongZ(this.objects.armCounterweightPivot.object1.rotation.z, this.objects.armCounterweightPivot.object1Position).add(
                    this.objects.armCounterweightPivot.object1.position
                  )
                ).y
              }
              stroke="#222"
              strokeWidth="0.2"
            />
            {/* Projectile */}
            <circle
              transform={`rotate(${-this.objects.projectile.rotation.z * (180 / Math.PI)}, ${
                this.updatePointPositionToFitCanvas(this.objects.projectile.position).x
              }, ${this.updatePointPositionToFitCanvas(this.objects.projectile.position).y})`}
              cx={this.updatePointPositionToFitCanvas(this.objects.projectile.position).x}
              cy={this.updatePointPositionToFitCanvas(this.objects.projectile.position).y}
              r={0.3}
              fill="#FFF"
            />

            {/* Projectile line */}
            {!this.detached && (
              <line
                x1={this.updatePointPositionToFitCanvas(this.objects.projectile.position).x}
                y1={this.updatePointPositionToFitCanvas(this.objects.projectile.position).y}
                x2={
                  this.updatePointPositionToFitCanvas(
                    rotateVectorAlongZ(this.objects.armProjectilePivot.object1.rotation.z, this.objects.armProjectilePivot.object1Position).add(
                      this.objects.armProjectilePivot.object1.position
                    )
                  ).x
                }
                y2={
                  this.updatePointPositionToFitCanvas(
                    rotateVectorAlongZ(this.objects.armProjectilePivot.object1.rotation.z, this.objects.armProjectilePivot.object1Position).add(
                      this.objects.armProjectilePivot.object1.position
                    )
                  ).y
                }
                stroke="#222"
                strokeWidth="0.2"
              />
            )}

            {/* Names */}
            {this.engine.solids.map(s => (
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
            {/* Speeds */}
            {this.state.showSpeeds &&
              this.engine.solids.map(s => {
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
            {/* Accelerations */}
            {this.state.showAccelerations &&
              this.engine.solids.map(s => {
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
            {/* Forces */}
            {this.state.showForces &&
              this.engine.constraints.map(c => {
                const pos = c.object1.position.add(rotateVectorAlongVector(c.object1.rotation, c.object1Position));
                const force = c.forceAppliedToFirstObject;
                const forceEnds = pos.add(force.multiply(0.01));
                return (
                  <g key={c.name + "-force"}>
                    <line
                      x1={this.updatePointPositionToFitCanvas(pos).x}
                      y1={this.updatePointPositionToFitCanvas(pos).y}
                      x2={this.updatePointPositionToFitCanvas(forceEnds).x}
                      y2={this.updatePointPositionToFitCanvas(forceEnds).y}
                      stroke="#cc22cc"
                      strokeWidth="0.1"
                    />
                    <text
                      fontSize="0.04rem"
                      x={this.updatePointPositionToFitCanvas(pos.add(forceEnds).multiply(0.5)).x}
                      y={this.updatePointPositionToFitCanvas(pos.add(forceEnds).multiply(0.5)).y}
                      textAnchor="start"
                      fill="#cc22cc"
                    >
                      {force.norm().toFixed(2)} N
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>
      </div>
    );
  }
}

export const Trebuchet = Visualizer;
