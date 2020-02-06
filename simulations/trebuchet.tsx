import "@fortawesome/fontawesome-free/css/all.css";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.css"; // Import precompiled Bootstrap css
import * as React from "react";
import { Engine } from "../engine/engine";
import { Vector3 } from "../engine/models/vector3";
import { rotateVectorAlongVector, rotateVectorAlongZ } from "../utils/vector-utils";
import { getTrebuchetObjects, TrebuchetObjects, TrebuchetSettings } from "./trebuchet-objects";
import lodash from "lodash";
import { Settings } from "./settings";
import { defaultTrebuchetSettings } from "./default-settings";
import { TrebuchetViewport } from "./viewport";

interface VizualizerState {
  showSpeeds: boolean;
  showAccelerations: boolean;
  showForces: boolean;
  speed: number;
  releaseAngle?: number;
  pauseAfterRelease: boolean;

  settings: TrebuchetSettings;
}

class Visualizer extends React.Component<{}, VizualizerState> {
  sub: number;
  play: boolean;
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
      settings: defaultTrebuchetSettings,
      releaseAngle: (45 * Math.PI) / 180
    };

    this.setup();
  }

  setup() {
    this.detached = false;
    this.releaseVelocity = undefined;

    this.objects = getTrebuchetObjects(this.state.settings);
    this.engine = new Engine({
      constraints: [this.objects.armPivot, this.objects.armCounterweightPivot, this.objects.armProjectilePivot, this.objects.projectileToGround],
      gravity: 9.8,
      solids: [this.objects.arm, this.objects.counterweight, this.objects.projectile],
      timeStep: 0.002,
      enableRungeKutta: false,
      energyDissipationCoefficient: 0 // 0.05
    });
    this.engine.initialize();
    this.engine.runOneStep({ dryRun: true });
    this.initialProjectileToGroundForce = this.objects.projectileToGround.forceAppliedToFirstObject.y;
  }
  /* 
  computeViewBox() {
    const minX = lodash.min(this.engine.solids.map(i => i.position.x).concat(5));
    const minY = lodash.min(this.engine.solids.map(i => i.position.y).concat(5));
    const maxX = lodash.max(this.engine.solids.map(i => i.position.x).concat(10));
    const maxY = lodash.max(this.engine.solids.map(i => i.position.y).concat(20));

    this.viewStart = [minX - 10, minY - 10];
    this.viewEnd = [maxX + 10, maxY + 10];
  } */

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

  computationCount: number;
  lastRecordDate?: Date;
  fps: number;
  async run() {
    this.play = true;
    this.computationCount = 0;
    this.lastRecordDate = undefined;
    this.renderView();

    let counter = 0;
    while (this.play) {
      counter++;
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
      this.computationCount++;

      const ellapsed = new Date().getTime() - start.getTime();
      const waitDuration = Math.max(0, this.engine.timeStep / this.state.speed - ellapsed / 1000);

      if (!this.lastRecordDate) {
        this.lastRecordDate = new Date();
      } else {
        const ellapsed = new Date().getTime() - this.lastRecordDate.getTime();
        if (ellapsed > 1000) {
          this.fps = this.computationCount * (ellapsed / 1000);
          this.computationCount = 0;
          this.lastRecordDate = new Date();
        }
      }

      if (waitDuration > 0) {
        await new Promise(r => setTimeout(r, waitDuration * 1000));
      } else {
        if (counter % 10 === 0) {
          // freeup the thread once in a while
          await new Promise(r => setTimeout(r, 0));
        }
      }
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
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-2 col-md-2 col-sm-4">
            <Settings
              onSubmit={data => {
                this.setState({ settings: data });
                this.setup();
              }}
            />
          </div>
          <div className="col-lg-10 col-md-10 col-sm-8">
            <form className="form-inline justify-content-center">
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

            <TrebuchetViewport
              detached={this.detached}
              engine={this.engine}
              fps={this.fps}
              objects={this.objects}
              releaseVelocity={this.releaseVelocity}
              settings={this.state.settings}
              showAccelerations={this.state.showAccelerations}
              showForces={this.state.showForces}
              showSpeeds={this.state.showSpeeds}
            />
          </div>
        </div>
      </div>
    );
  }
}

export const Trebuchet = Visualizer;
