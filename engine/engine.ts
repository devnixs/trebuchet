// import MathJs, { Matrix } from "mathjs";
import { rotateVectorAlongZ, rotateVector, rotateVectorAlongVector } from "../utils/vector-utils";
import { Constraint } from "./models/constraint";
import { Pivot } from "./models/pivot";
import { Solid } from "./models/solid";
import { EquationTerm, Equation } from "./models/equation";
import { ChainOfSolid } from "./models/chain-of-solid";
import { Vector3 } from "./models/vector3";
import { Matrix33 } from "./models/matrix33";
import { Solver } from "./models/solver";

interface EngineSettings {
  solids: Solid[];
  constraints: Constraint[];

  timeStep: number;
  gravity: number;
}

export class Engine {
  solids: Solid[];
  constraints: Constraint[];
  timeStep: number;
  gravity: number;
  initialized: boolean;
  time = 0;
  constructor(settings: EngineSettings) {
    this.solids = settings.solids;
    this.constraints = settings.constraints;
    this.timeStep = settings.timeStep;
    this.gravity = settings.gravity;
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
    // inialise speeds
    this.solids.forEach(s => (s.speed = Vector3.zero()));
    this.solids.forEach(s => (s.rotation = Vector3.zero()));
    this.solids.forEach(s => (s.rotationalSpeed = Vector3.zero()));

    this.solids.forEach(s => (s.acceleration = Vector3.zero()));
    this.solids.forEach(s => (s.rotationalAcceleration = Vector3.zero()));

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
                value: GP.x,
                element: c
              } as EquationTerm;
            } else {
              const GP = rotateVectorAlongVector(solid.rotation, c.object2Position);
              return {
                unknownFactor: "yforce",
                value: -GP.x,
                element: c
              } as EquationTerm;
            }
          })
        ]
      });
    }
    return equations;
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

  private addPivotRelationships2() {
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

  private runChecks() {
    const solidWithNoConstraint = this.solids.find(s => !this.constraints.find(c => c.object1 === s || c.object2 === s));
    if (solidWithNoConstraint) {
      throw Error('Solid "' + solidWithNoConstraint.name + '" had no constraint. This is not supported');
    }

    // TODO: ensure names of solids and constraints are unique
  }

  public runOneStep() {
    if (!this.initialized) {
      throw new Error("Please call .initialize() first");
    }

    // We're looking for 2 linear acceleration and 1 angular acceleration for each solid
    // + 2 forces for each constraints

    let equations: Equation[] = [];
    equations = equations.concat(this.applySumOfForces());
    equations = equations.concat(this.applyDynamicMomentEquation());
    // equations = equations.concat(this.addPivotRelationships1());
    equations = equations.concat(this.addPivotRelationships2());

    const solver = new Solver(equations);
    const solutions = solver.solve();

    for (const solution of solutions) {
      if (solution.element instanceof Solid) {
        if (solution.unknown === "d²x/dt") {
          solution.element.acceleration.x = solution.value;
        }
        if (solution.unknown === "d²y/dt") {
          solution.element.acceleration.y = solution.value;
        }
        if (solution.unknown === "d²w/dt") {
          solution.element.rotationalAcceleration.z = solution.value;
        }
      }
      if (solution.element instanceof Constraint) {
        if (solution.unknown === "xforce") {
          solution.element.forceAppliedToFirstObject.x = solution.value;
        }
        if (solution.unknown === "yforce") {
          solution.element.forceAppliedToFirstObject.y = solution.value;
        }
      }
    }

    // update speeds
    for (const solid of this.solids) {
      solid.speed = solid.speed.add(solid.acceleration.multiply(this.timeStep));
      solid.rotationalSpeed = solid.rotationalSpeed.add(solid.rotationalAcceleration.multiply(this.timeStep));
    }

    // update positions
    for (const solid of this.solids) {
      solid.position = solid.position.add(solid.speed.multiply(this.timeStep));
      solid.rotation = solid.rotation.add(solid.rotationalSpeed.multiply(this.timeStep));
    }

    // update time
    this.time += this.timeStep;
  }
}
