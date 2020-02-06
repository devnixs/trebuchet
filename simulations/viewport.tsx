import * as React from "react";
import { Formik } from "formik";
import { Vector3 } from "../engine/models/vector3";
import { Engine } from "../engine/engine";
import { TrebuchetObjects, TrebuchetSettings } from "./trebuchet-objects";
import { rotateVectorAlongZ, rotateVectorAlongVector } from "../utils/vector-utils";

interface TrebuchetViewportProps {
  engine: Engine;
  objects: TrebuchetObjects;
  fps?: number;
  releaseVelocity?: number;
  settings: TrebuchetSettings;
  detached: boolean;

  showAccelerations: boolean;
  showSpeeds: boolean;
  showForces: boolean;
}

export class TrebuchetViewport extends React.Component<TrebuchetViewportProps> {
  viewStart = [-10, -5];
  viewEnd = [20, 30];

  updatePointPositionToFitCanvas(pos: Vector3) {
    return new Vector3(pos.x, this.viewEnd[1] - pos.y, pos.z);
  }

  render() {
    return (
      <div>
        <svg
          style={{ width: "100vw", height: "calc(100vh - 50px)" }}
          viewBox={`${this.viewStart[0]} ${0} ${this.viewEnd[0] - this.viewStart[0]} ${this.viewEnd[1] - this.viewStart[1]}`}
        >
          <text fontSize="0.04rem" x={0} y={1} textAnchor="start" fill="#ccc">
            Ellapsed {this.props.engine.time.toFixed(2)}s
          </text>
          <text fontSize="0.04rem" x={0} y={2} textAnchor="start" fill="#ccc">
            Projectile Velocity {this.props.objects.projectile.speed.norm().toFixed(2)}m/s
          </text>
          {this.props.objects.projectile.speed.norm() > 0 && (
            <text fontSize="0.04rem" x={-10} y={2} textAnchor="start" fill="#ccc">
              Projectile Angle {((this.props.objects.projectile.speed.angle() * 180) / Math.PI).toFixed(2)}°
            </text>
          )}
          {this.props.fps > 0 && (
            <text fontSize="0.04rem" x={-10} y={1} textAnchor="start" fill="#ccc">
              {Math.ceil(this.props.fps)} Computations/s
            </text>
          )}
          {this.props.releaseVelocity ? (
            <text fontSize="0.04rem" x={10} y={1.5} textAnchor="start" fontWeight="bold" fill="#fff">
              Release Velocity : {this.props.releaseVelocity.toFixed(2)} m/s
            </text>
          ) : null}
          {this.props.engine.constraints.map(c => {
            const posRelativeToObject = rotateVectorAlongZ(c.object1.rotation.z, c.object1Position);
            const pos = c.object1.position.add(posRelativeToObject);
            const UIPos = this.updatePointPositionToFitCanvas(pos);
            return <circle key={c.name} cx={UIPos.x} cy={UIPos.y} r="0.1" fill="#009999" />;
          })}
          {/* Arm */}
          <rect
            transform={`rotate(${-(this.props.objects.arm.rotation.z + this.props.settings.initialAngle) * (180 / Math.PI)}, ${
              this.updatePointPositionToFitCanvas(this.props.objects.arm.position).x
            }, ${this.updatePointPositionToFitCanvas(this.props.objects.arm.position).y})`}
            x={
              this.updatePointPositionToFitCanvas(this.props.objects.arm.position).x -
              (this.props.settings.lengthOfLongArm + this.props.settings.lengthOfShortArm) / 2
            }
            y={this.updatePointPositionToFitCanvas(this.props.objects.arm.position).y - this.props.settings.armWidth / 2}
            width={this.props.settings.lengthOfLongArm + this.props.settings.lengthOfShortArm}
            height={this.props.settings.armWidth}
            fill="#555"
          />
          {/* Trebuchet holding line */}
          <line
            x1={this.updatePointPositionToFitCanvas(new Vector3(0, 0, 0)).x}
            y1={this.updatePointPositionToFitCanvas(new Vector3(0, 0, 0)).y}
            x2={this.updatePointPositionToFitCanvas(new Vector3(0, 0, 0)).x}
            y2={
              this.updatePointPositionToFitCanvas(
                rotateVectorAlongZ(this.props.objects.armPivot.object1.rotation.z, this.props.objects.armPivot.object1Position).add(
                  this.props.objects.armPivot.object1.position
                )
              ).y
            }
            stroke="#BC6C25"
            strokeWidth="0.15"
          />
          <line
            x1={this.updatePointPositionToFitCanvas(new Vector3(-this.props.settings.heightOfPivot / 2, 0, 0)).x}
            y1={this.updatePointPositionToFitCanvas(new Vector3(-this.props.settings.heightOfPivot / 2, 0, 0)).y}
            x2={this.updatePointPositionToFitCanvas(new Vector3(this.props.settings.heightOfPivot / 2, 0, 0)).x}
            y2={this.updatePointPositionToFitCanvas(new Vector3(this.props.settings.heightOfPivot / 2, 0, 0)).y}
            stroke="#BC6C25"
            strokeWidth="0.15"
          />
          <line
            x1={this.updatePointPositionToFitCanvas(new Vector3(-this.props.settings.heightOfPivot / 3, 0, 0)).x}
            y1={this.updatePointPositionToFitCanvas(new Vector3(-this.props.settings.heightOfPivot / 3, 0, 0)).y}
            x2={this.updatePointPositionToFitCanvas(new Vector3(0, this.props.settings.heightOfPivot / 2, 0)).x}
            y2={this.updatePointPositionToFitCanvas(new Vector3(0, this.props.settings.heightOfPivot / 2, 0)).y}
            stroke="#BC6C25"
            strokeWidth="0.15"
          />
          <line
            x1={this.updatePointPositionToFitCanvas(new Vector3(this.props.settings.heightOfPivot / 3, 0, 0)).x}
            y1={this.updatePointPositionToFitCanvas(new Vector3(this.props.settings.heightOfPivot / 3, 0, 0)).y}
            x2={this.updatePointPositionToFitCanvas(new Vector3(0, this.props.settings.heightOfPivot / 2, 0)).x}
            y2={this.updatePointPositionToFitCanvas(new Vector3(0, this.props.settings.heightOfPivot / 2, 0)).y}
            stroke="#BC6C25"
            strokeWidth="0.15"
          />
          {/* Countweight */}
          <circle
            transform={`rotate(${-this.props.objects.counterweight.rotation.z * (180 / Math.PI)}, ${
              this.updatePointPositionToFitCanvas(this.props.objects.counterweight.position).x
            }, ${this.updatePointPositionToFitCanvas(this.props.objects.counterweight.position).y})`}
            cx={this.updatePointPositionToFitCanvas(this.props.objects.counterweight.position).x}
            cy={this.updatePointPositionToFitCanvas(this.props.objects.counterweight.position).y}
            r={this.props.settings.counterweightRadius * 3}
            fill="#555"
          />
          {/* Counterweight line */}
          <line
            x1={this.updatePointPositionToFitCanvas(this.props.objects.counterweight.position).x}
            y1={this.updatePointPositionToFitCanvas(this.props.objects.counterweight.position).y}
            x2={
              this.updatePointPositionToFitCanvas(
                rotateVectorAlongZ(this.props.objects.armCounterweightPivot.object1.rotation.z, this.props.objects.armCounterweightPivot.object1Position).add(
                  this.props.objects.armCounterweightPivot.object1.position
                )
              ).x
            }
            y2={
              this.updatePointPositionToFitCanvas(
                rotateVectorAlongZ(this.props.objects.armCounterweightPivot.object1.rotation.z, this.props.objects.armCounterweightPivot.object1Position).add(
                  this.props.objects.armCounterweightPivot.object1.position
                )
              ).y
            }
            stroke="#222"
            strokeWidth="0.2"
          />
          {/* Projectile */}
          <circle
            transform={`rotate(${-this.props.objects.projectile.rotation.z * (180 / Math.PI)}, ${
              this.updatePointPositionToFitCanvas(this.props.objects.projectile.position).x
            }, ${this.updatePointPositionToFitCanvas(this.props.objects.projectile.position).y})`}
            cx={this.updatePointPositionToFitCanvas(this.props.objects.projectile.position).x}
            cy={this.updatePointPositionToFitCanvas(this.props.objects.projectile.position).y}
            r={0.3}
            fill="#FFF"
          />

          {/* Projectile line */}
          {!this.props.detached && (
            <line
              x1={this.updatePointPositionToFitCanvas(this.props.objects.projectile.position).x}
              y1={this.updatePointPositionToFitCanvas(this.props.objects.projectile.position).y}
              x2={
                this.updatePointPositionToFitCanvas(
                  rotateVectorAlongZ(this.props.objects.armProjectilePivot.object1.rotation.z, this.props.objects.armProjectilePivot.object1Position).add(
                    this.props.objects.armProjectilePivot.object1.position
                  )
                ).x
              }
              y2={
                this.updatePointPositionToFitCanvas(
                  rotateVectorAlongZ(this.props.objects.armProjectilePivot.object1.rotation.z, this.props.objects.armProjectilePivot.object1Position).add(
                    this.props.objects.armProjectilePivot.object1.position
                  )
                ).y
              }
              stroke="#222"
              strokeWidth="0.2"
            />
          )}

          {/* Names */}
          {this.props.engine.solids.map(s => (
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
          {this.props.showSpeeds &&
            this.props.engine.solids.map(s => {
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
          {this.props.showAccelerations &&
            this.props.engine.solids.map(s => {
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
          {this.props.showForces &&
            this.props.engine.constraints.map(c => {
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
    );
  }
}
