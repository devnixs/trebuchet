// import MathJs, { Matrix } from "mathjs";
import { rotateVectorAlongZ, rotateVector, rotateVectorAlongVector } from "../utils/vector-utils";
import { Constraint } from "./models/constraint";
import { Pivot } from "./models/pivot";
import { Solid } from "./models/solid";
import { EquationTerm, Equation, Solution, addSolution, multiplySolution } from "./models/equation";
import { ChainOfSolid } from "./models/chain-of-solid";
import { Vector3 } from "./models/vector3";
import { Matrix33 } from "./models/matrix33";
import { Solver } from "./models/solver";
import { Slider } from "./models/slider";

interface EngineSettings {
  solids: Solid[];
  constraints: Constraint[];

  timeStep: number;
  gravity: number;

  energyDissipationCoefficient: number;
  enableRungeKutta: boolean;
}

export class Engine {
  solids: Solid[];
  constraints: Constraint[];
  timeStep: number;
  gravity: number;
  initialized: boolean;
  time = 0;
  energyDissipationCoefficient: number;
  enableRungeKutta: boolean;
  constructor(settings: EngineSettings) {
    this.solids = settings.solids;
    this.constraints = settings.constraints;
    this.timeStep = settings.timeStep;
    this.gravity = settings.gravity;
    this.enableRungeKutta = settings.enableRungeKutta;
    this.energyDissipationCoefficient = settings.energyDissipationCoefficient;
  }

  reset() {
    this.solids.forEach(i => i.reset());
  }

  getSolutionIndex(element: Solid | Constraint, type: "d²x/dt" | "d²y/dt" | "d²w/dt" | "xforce" | "yforce") {
    if (element instanceof Solid) {
      if (type === "d²x/dt") {
        return this.solids.indexOf(element) * 3 + 0;
      }
      if (type === "d²y/dt") {
        return this.solids.indexOf(element) * 3 + 1;
      }
      if (type === "d²w/dt") {
        return this.solids.indexOf(element) * 3 + 2;
      }
    }
    if (element instanceof Constraint) {
      if (type === "xforce") {
        return this.solids.length * 3 + this.constraints.indexOf(element) * 2 + 0;
      }
      if (type === "yforce") {
        return this.solids.length * 3 + this.constraints.indexOf(element) * 2 + 1;
      }
    }
  }

  public initialize() {
    this.runChecks();

    this.initialized = true;
  }

  private applySumOfForces() {
    const equations: Equation[] = [];
    // the sum of the forces will be equal to the acceleration times the mass

    for (const solid of this.solids) {
      const constraintsOfThisSolid = this.constraints.filter(i => i.object1 === solid || i.object2 === solid);

      equations.push({
        terms: [
          {
            value: 0,
            element: null,
            unknownFactor: "none"
          },
          {
            unknownFactor: "d²x/dt",
            value: solid.mass,
            element: solid
          },
          ...constraintsOfThisSolid.map(
            c =>
              ({
                unknownFactor: "xforce",
                value: c.object1 === solid ? -1 : 1,
                element: c
              } as EquationTerm)
          )
        ]
      });

      equations.push({
        terms: [
          {
            value: -solid.mass * this.gravity,
            element: null,
            unknownFactor: "none"
          },
          {
            unknownFactor: "d²y/dt",
            value: solid.mass,
            element: solid
          },
          ...constraintsOfThisSolid.map(
            c =>
              ({
                unknownFactor: "yforce",
                value: c.object1 === solid ? -1 : 1,
                element: c
              } as EquationTerm)
          )
        ]
      });
    }
    return equations;
  }

  private applyDynamicMomentEquation() {
    // all the moment in G will be equal to the acceleration times the inertia matrix

    const equations: Equation[] = [];
    for (const solid of this.solids) {
      const constraintsOfThisSolid = this.constraints.filter(i => i.object1 === solid || i.object2 === solid);

      equations.push({
        terms: [
          {
            unknownFactor: "d²w/dt",
            value: solid.inertia.get(2, 2),
            element: solid
          },
          ...constraintsOfThisSolid.map(c => {
            if (c.object1 === solid) {
              const GP = rotateVectorAlongVector(solid.rotation, c.object1Position);
              return {
                unknownFactor: "xforce",
                value: GP.y,
                element: c
              } as EquationTerm;
            } else {
              const GP = rotateVectorAlongVector(solid.rotation, c.object2Position);
              return {
                unknownFactor: "xforce",
                value: -GP.y,
                element: c
              } as EquationTerm;
            }
          }),
          ...constraintsOfThisSolid.map(c => {
            if (c.object1 === solid) {
              const GP = rotateVectorAlongVector(solid.rotation, c.object1Position);
              return {
                unknownFactor: "yforce",
                value: -GP.x,
                element: c
              } as EquationTerm;
            } else {
              const GP = rotateVectorAlongVector(solid.rotation, c.object2Position);
              return {
                unknownFactor: "yforce",
                value: GP.x,
                element: c
              } as EquationTerm;
            }
          })
        ]
      });
    }
    return equations;
  }

  removeConstraint(constraint: Constraint) {
    this.constraints = this.constraints.filter(i => i !== constraint);
  }

  addConstraint(constraint: Constraint) {
    this.constraints.push(constraint);
  }

  private getPointSpeed(solid: Solid, point: Vector3): Vector3 {
    //  V M/R = VM/R' + VO'/R + dw/dt ^ O'M
    //           0        A       B      C

    const A = solid.speed;
    const B = solid.rotationalSpeed;
    const C = rotateVectorAlongVector(solid.rotation, point);

    const BC = B.cross(C);
    return A.add(BC);
  }

  private addPivotRelationships() {
    const equations = [] as Equation[];

    // Acceleration of pivotal point P =
    // aG + d²w/dt ^ GP + dw/dt ^ dGP/dt
    //  A      B     C       D      E

    for (const pivot of this.constraints.filter(i => i instanceof Pivot)) {
      // Acceleration of pivotal point is the same for both solids

      // firstTerm
      const C1 = rotateVectorAlongVector(pivot.object1.rotation, pivot.object1Position);
      const D1 = pivot.object1.rotationalSpeed;
      const E1 = this.getPointSpeed(pivot.object1, pivot.object1Position).subtract(pivot.object1.speed);

      const xTerms: EquationTerm[] = [
        { element: pivot.object1, unknownFactor: "d²x/dt", value: 1 },
        { element: pivot.object1, unknownFactor: "d²w/dt", value: -C1.y },
        { element: pivot.object1, unknownFactor: "none", value: -D1.cross(E1).x }
      ];
      const yTerms: EquationTerm[] = [
        { element: pivot.object1, unknownFactor: "d²y/dt", value: 1 },
        { element: pivot.object1, unknownFactor: "d²w/dt", value: C1.x },
        { element: pivot.object1, unknownFactor: "none", value: -D1.cross(E1).y }
      ];

      // if there's no other part to the pivot, then the acceleration is 0, else, substract the other part of the equation : a = b => a-b=0
      // secondTerm
      if (pivot.object2) {
        const C2 = rotateVectorAlongVector(pivot.object2.rotation, pivot.object2Position);
        const D2 = pivot.object2.rotationalSpeed;
        const E2 = this.getPointSpeed(pivot.object2, pivot.object2Position).subtract(pivot.object2.speed);
        xTerms.push({ element: pivot.object2, unknownFactor: "d²x/dt", value: -1 });
        xTerms.push({ element: pivot.object2, unknownFactor: "d²w/dt", value: C2.y });
        xTerms.push({ element: pivot.object2, unknownFactor: "none", value: D2.cross(E2).x });
        yTerms.push({ element: pivot.object2, unknownFactor: "d²y/dt", value: -1 });
        yTerms.push({ element: pivot.object2, unknownFactor: "d²w/dt", value: -C2.x });
        yTerms.push({ element: pivot.object2, unknownFactor: "none", value: D2.cross(E2).y });
      }

      equations.push({
        terms: xTerms
      });

      equations.push({
        terms: yTerms
      });
    }
    return equations;
  }

  addPonctualRelationships() {
    const equations = [] as Equation[];

    // Acceleration of pivotal point P =
    // aG + d²w/dt ^ GP + dw/dt ^ dGP/dt
    //  A      B     C       D      E

    for (const ponctual of this.constraints.filter(i => i instanceof Slider).map(i => i as Slider)) {
      // Acceleration of pivotal point is the same for both solids

      let axisInR = ponctual.axisInrelationToObject2;
      if (ponctual.object2) {
        // the axis is moving with object2
        axisInR = rotateVectorAlongVector(ponctual.object2.rotation, ponctual.axisInrelationToObject2);
      }

      // it's like the pivot, but we project it along the cross axis
      const crossAxis = axisInR.rotate(new Vector3(0, 0, Math.PI / 2)).normalize();

      // firstTerm
      const C1 = rotateVectorAlongVector(ponctual.object1.rotation, ponctual.object1Position);
      const D1 = ponctual.object1.rotationalSpeed;
      const E1 = this.getPointSpeed(ponctual.object1, ponctual.object1Position).subtract(ponctual.object1.speed);

      const terms: EquationTerm[] = [
        { element: ponctual.object1, unknownFactor: "d²x/dt", value: crossAxis.x },
        { element: ponctual.object1, unknownFactor: "d²w/dt", value: -C1.y * crossAxis.x },
        { element: ponctual.object1, unknownFactor: "none", value: -D1.cross(E1).x * crossAxis.x },

        { element: ponctual.object1, unknownFactor: "d²y/dt", value: 1 * crossAxis.y },
        { element: ponctual.object1, unknownFactor: "d²w/dt", value: C1.x * crossAxis.y },
        { element: ponctual.object1, unknownFactor: "none", value: -D1.cross(E1).y * crossAxis.y }
      ];

      // if there's no other part to the pivot, then the acceleration is 0, else, substract the other part of the equation : a = b => a-b=0
      // secondTerm
      if (ponctual.object2) {
        const C2 = rotateVectorAlongVector(ponctual.object2.rotation, ponctual.object2Position);
        const D2 = ponctual.object2.rotationalSpeed;
        const E2 = this.getPointSpeed(ponctual.object2, ponctual.object2Position).subtract(ponctual.object2.speed);
        terms.push({ element: ponctual.object2, unknownFactor: "d²x/dt", value: -1 * crossAxis.x });
        terms.push({ element: ponctual.object2, unknownFactor: "d²w/dt", value: C2.y * crossAxis.x });
        terms.push({ element: ponctual.object2, unknownFactor: "none", value: D2.cross(E2).x * crossAxis.x });

        terms.push({ element: ponctual.object2, unknownFactor: "d²y/dt", value: -1 * crossAxis.y });
        terms.push({ element: ponctual.object2, unknownFactor: "d²w/dt", value: -C2.x * crossAxis.y });
        terms.push({ element: ponctual.object2, unknownFactor: "none", value: D2.cross(E2).y * crossAxis.y });
      }
      equations.push({ terms: terms });
    }
    return equations;
  }

  private addConstraintsDegreeOfFreedom() {
    const equations = [] as Equation[];

    for (const constraint of this.constraints) {
      if (constraint instanceof Pivot) {
        // pivots don't convey any torque
        equations.push({
          terms: [
            { element: constraint, unknownFactor: "ztorque", value: 1 },
            { element: null, unknownFactor: "none", value: 0 }
          ]
        });
      }
      if (constraint instanceof Slider) {
        // ponctuals don't convey any torque
        equations.push({
          terms: [
            { element: constraint, unknownFactor: "ztorque", value: 1 },
            { element: null, unknownFactor: "none", value: 0 }
          ]
        });
        // ponctuals don't convey any force along their axis

        let axisInR = constraint.axisInrelationToObject2;
        if (constraint.object2) {
          // the axis is moving with object2
          axisInR = rotateVectorAlongVector(constraint.object2.rotation, constraint.axisInrelationToObject2);
        }

        // the force is perpendicular to the axis so the dot product is = 0
        equations.push({
          terms: [
            { element: constraint, unknownFactor: "xforce", value: axisInR.x },
            { element: constraint, unknownFactor: "yforce", value: axisInR.y },
            { element: null, unknownFactor: "none", value: 0 }
          ]
        });
      }
    }
    return equations;
  }

  private runChecks() {
    const solidWithNoConstraint = this.solids.find(s => !this.constraints.find(c => c.object1 === s || c.object2 === s));
    if (solidWithNoConstraint) {
      throw Error('Solid "' + solidWithNoConstraint.name + '" had no constraint. This is not supported');
    }

    // TODO: ensure names of solids and constraints are unique
  }

  private computeSolutions() {
    let equations: Equation[] = [];
    equations = equations.concat(this.applySumOfForces());
    equations = equations.concat(this.applyDynamicMomentEquation());
    equations = equations.concat(this.addPivotRelationships());
    equations = equations.concat(this.addPonctualRelationships());
    equations = equations.concat(this.addConstraintsDegreeOfFreedom());

    const solver = new Solver(equations);
    const solutions = solver.solve();

    return solutions;
  }

  private applySolutionsToElements(solutions: Solution[]) {
    for (const solution of solutions) {
      if (solution.element instanceof Solid) {
        if (solution.unknown === "d²x/dt") {
          solution.element.acceleration = new Vector3(solution.value, solution.element.acceleration.y, solution.element.acceleration.z);
        }
        if (solution.unknown === "d²y/dt") {
          solution.element.acceleration = new Vector3(solution.element.acceleration.x, solution.value, solution.element.acceleration.z);
        }
        if (solution.unknown === "d²w/dt") {
          solution.element.rotationalAcceleration = new Vector3(
            solution.element.rotationalAcceleration.x,
            solution.element.rotationalAcceleration.y,
            solution.value
          );
        }
      }
      if (solution.element instanceof Constraint) {
        if (solution.unknown === "xforce") {
          solution.element.forceAppliedToFirstObject = new Vector3(
            solution.value,
            solution.element.forceAppliedToFirstObject.y,
            solution.element.forceAppliedToFirstObject.z
          );
        }
        if (solution.unknown === "yforce") {
          solution.element.forceAppliedToFirstObject = new Vector3(
            solution.element.forceAppliedToFirstObject.x,
            solution.value,
            solution.element.forceAppliedToFirstObject.z
          );
        }
        if (solution.unknown === "ztorque") {
          solution.element.forceAppliedToFirstObject = new Vector3(
            solution.element.forceAppliedToFirstObject.x,
            solution.element.forceAppliedToFirstObject.y,
            solution.value
          );
        }
      }
    }
  }

  private fixConstraints() {
    // with time, a small bias may appear, we need to fix up the constraints
    for (const constraint of this.constraints) {
      if (constraint instanceof Pivot) {
        const positionOfConstraintInObject1 = constraint.object1.position.add(rotateVectorAlongVector(constraint.object1.rotation, constraint.object1Position));

        if (constraint.object2) {
          const positionOfConstraintInObject2 = constraint.object2.position.add(
            rotateVectorAlongVector(constraint.object2.rotation, constraint.object2Position)
          );
          const difference = positionOfConstraintInObject2.subtract(positionOfConstraintInObject1);
          constraint.object2.position = constraint.object2.position.subtract(difference);
        } else {
          // it is fixed to the ground
          var difference = constraint.initialPosition.subtract(positionOfConstraintInObject1);
          constraint.object1.position = constraint.object1.position.add(difference);
        }
      }
      // TODO: apply slider fixes
    }
  }

  private moveObjectsAccordingToTheirAcceleration(timeStep: number) {
    // update speeds
    for (const solid of this.solids) {
      solid.speed = solid.speed.add(solid.acceleration.multiply(timeStep)); //.multiply(1 - this.energyDissipationCoefficient * timeStep);
      solid.rotationalSpeed = solid.rotationalSpeed.add(solid.rotationalAcceleration.multiply(timeStep));
      //.multiply(1 - this.energyDissipationCoefficient * timeStep);
    }

    // update positions
    for (const solid of this.solids) {
      solid.position = solid.position.add(solid.speed.multiply(timeStep));
      solid.rotation = solid.rotation.add(solid.rotationalSpeed.multiply(timeStep));
    }
  }

  private computeRungeKuttaOrder4(timeStep: number) {
    const backups = this.solids.map(i => ({
      solid: i,
      speed: i.speed,
      position: i.position,
      rotation: i.rotation,
      rotationalSpeed: i.rotationalSpeed
    }));

    // K1
    const k1 = this.computeSolutions();

    // K2
    // for k2, we need to move half a timestep.
    this.applySolutionsToElements(k1);
    this.moveObjectsAccordingToTheirAcceleration(timeStep / 2);

    const k2 = this.computeSolutions();

    // K3
    // rollback
    backups.forEach(b => {
      b.solid.position = b.position;
      b.solid.speed = b.speed;
      b.solid.rotation = b.rotation;
      b.solid.rotationalSpeed = b.rotationalSpeed;
    });
    this.applySolutionsToElements(k2);
    this.moveObjectsAccordingToTheirAcceleration(timeStep / 2);
    const k3 = this.computeSolutions();

    // K4
    // rollback
    backups.forEach(b => {
      b.solid.position = b.position;
      b.solid.speed = b.speed;
      b.solid.rotation = b.rotation;
      b.solid.rotationalSpeed = b.rotationalSpeed;
    });
    this.applySolutionsToElements(k3);
    this.moveObjectsAccordingToTheirAcceleration(timeStep);
    const k4 = this.computeSolutions();

    // FINAL SOLUTION
    // rollback
    backups.forEach(b => {
      b.solid.position = b.position;
      b.solid.speed = b.speed;
      b.solid.rotation = b.rotation;
      b.solid.rotationalSpeed = b.rotationalSpeed;
    });

    // merge solutions together with
    // S = (1/6) * (K1 + 2xK2 + 2xK3 + K4)

    const k2p = multiplySolution(k2, 2);
    const k3p = multiplySolution(k3, 2);

    const final = multiplySolution(addSolution(addSolution(addSolution(k1, k2p), k3p), k4), 1 / 6);
    return final;
  }

  public runOneStep({ dryRun }: { dryRun?: boolean }) {
    if (!this.initialized) {
      throw new Error("Please call .initialize() first");
    }

    const duration = this.timeStep;

    if (dryRun) {
      const solutions = this.computeSolutions();
      this.applySolutionsToElements(solutions);
    } else {
      let solutions: Solution[];
      if (this.enableRungeKutta) {
        solutions = this.computeRungeKuttaOrder4(duration);
      } else {
        solutions = this.computeSolutions();
      }
      this.applySolutionsToElements(solutions);
      this.moveObjectsAccordingToTheirAcceleration(duration);
      this.fixConstraints();
      this.time += duration;
    }
  }
}
