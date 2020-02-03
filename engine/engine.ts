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

  private getPointSpeedInSolid(chain: ChainOfSolid, point: Vector3): Vector3 {
    //  V M/R = VM/R' + VO'/R + dw/dt ^ O'M
    //            0

    const baseSpeed = chain.element.rotationalSpeed.cross(rotateVectorAlongVector(chain.element.rotation, point));

    if (!chain.parent) {
      return baseSpeed as Vector3;
    } else {
      const originSpeed = this.getPointSpeedInSolid(
        chain.parent,
        chain.parentConstraint.object1 === chain.element ? chain.parentConstraint.object2Position : chain.parentConstraint.object1Position
      );
      return baseSpeed.add(originSpeed);
    }
  }

  private getPointAccelerationInSolid(chain: ChainOfSolid, point: Vector3, axis: Vector3) {
    //  aM/R = aO'/R  + d²w/dt² ^ O'M + dw/dt ^ dO'M/dt
    //    F       A       B        C      D         E

    const pivotPosition = chain.parentConstraint.object1 === chain.element ? chain.parentConstraint.object1Position : chain.parentConstraint.object2Position;

    // O'M = GM - GO'
    var GM = rotateVectorAlongVector(chain.element.rotation, point);
    var GOp = rotateVectorAlongVector(chain.element.rotation, pivotPosition);
    var OpM = GM.subtract(GOp);

    // O'M = OM - OO'

    var dOMdt = this.getPointSpeedInSolid(chain, point);
    var dOOpdt = this.getPointSpeedInSolid(chain, pivotPosition);
    var dOpMdt = dOMdt.subtract(dOOpdt);
    var DE = chain.element.rotationalSpeed.cross(dOpMdt);

    let terms: EquationTerm[] = [
      // F
      {
        element: chain.element,
        unknownFactor: axis.x ? "d²x/dt" : "d²y/dt",
        value: 1
      },
      // B ^ C
      {
        element: chain.element,
        unknownFactor: "d²w/dt",
        value: OpM.dot(axis)
      },
      {
        element: chain.element,
        unknownFactor: "none",
        value: DE.dot(axis)
      }
    ];

    if (chain.parent) {
      // A
      const positionOfPivotInParent =
        chain.parentConstraint.object1 === chain.element ? chain.parentConstraint.object2Position : chain.parentConstraint.object1Position;
      const A = this.getPointAccelerationInSolid(chain.parent, positionOfPivotInParent, axis);
      terms = terms.concat(A);
    }

    return terms;
  }

  private addPivotRelationshipInner(chain: ChainOfSolid) {
    let equations: Equation[] = [];

    // P is the pivot point

    // aG = aP/R + d²w/dt² ^ PG + dw/dt ^ dPG/dt
    //  A     B            C           D

    // dPG/dt = OG - OP;
    const dOGdt = this.getPointSpeedInSolid(chain, Vector3.zero());
    const pivotPosition = chain.parentConstraint.object1 === chain.element ? chain.parentConstraint.object1Position : chain.parentConstraint.object2Position;
    const dOPdt = this.getPointSpeedInSolid(chain, pivotPosition);
    const dPGdt = dOGdt.subtract(dOPdt);
    const D = chain.element.rotationalSpeed.cross(dPGdt);

    const xAxis = new Vector3(1, 0, 0);
    const yAxis = new Vector3(0, 1, 0);
    const zAxis = new Vector3(0, 0, 1);

    const xTerms: EquationTerm[] = [
      // A
      {
        element: chain.element,
        unknownFactor: "d²x/dt",
        value: 1
      },
      // C
      {
        element: chain.element,
        unknownFactor: "d²w/dt",
        value: -yAxis.dot(rotateVectorAlongZ(zAxis.dot(chain.element.rotation), pivotPosition))
      },
      // D
      {
        element: null,
        unknownFactor: "none",
        value: xAxis.dot(D)
      },
      ...this.getPointAccelerationInSolid(chain, pivotPosition, xAxis)
    ];
    equations.push({ terms: xTerms });

    const yTerms: EquationTerm[] = [
      // A
      {
        element: chain.element,
        unknownFactor: "d²y/dt",
        value: 1
      },
      // C
      {
        element: chain.element,
        unknownFactor: "d²w/dt",
        value: xAxis.dot(rotateVectorAlongZ(zAxis.dot(chain.element.rotation), pivotPosition))
      },
      // D
      {
        element: null,
        unknownFactor: "none",
        value: yAxis.dot(D)
      },
      ...this.getPointAccelerationInSolid(chain, pivotPosition, yAxis).map(i => ({ element: i.element, unknownFactor: i.unknownFactor, value: -1 * i.value }))
    ];
    equations.push({ terms: yTerms });

    const getParentsConstraints: (a: ChainOfSolid) => Constraint[] = (a: ChainOfSolid) =>
      a.parent ? [a.parentConstraint, ...getParentsConstraints(a.parent)] : [a.parentConstraint];
    const allParents = getParentsConstraints(chain);

    const children = this.constraints.filter(i => (i.object1 === chain.element || i.object2 === chain.element) && !allParents.find(parent => parent === i));

    for (const child of children) {
      equations = equations.concat(
        this.addPivotRelationshipInner({
          element: child.object1 === chain.element ? child.object2 : child.object1,
          parentConstraint: child,
          parent: chain
        })
      );
    }

    return equations;
  }

  private addPivotRelationships1() {
    const pivotLinkedToGround = this.constraints.filter(i => i instanceof Pivot).find(i => !i.object2);
    if (!pivotLinkedToGround) {
      throw new Error("Could not a find a constraint that linked the structure to the ground");
    }

    return this.addPivotRelationshipInner({ parentConstraint: pivotLinkedToGround, element: pivotLinkedToGround.object1 });
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
