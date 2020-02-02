import MathJs, { Matrix } from "mathjs";
import { rotateVectorAlongZ } from "../utils/vector-utils";
import { Constraint } from "./models/constraint";
import { Pivot } from "./models/pivot";
import { Solid } from "./models/solid";
import { SolutionMatrix } from "./models/solution-matrix";
import { EquationTerm, Equation } from "./models/equation";
import { ChainOfSolid } from "./models/chain-of-solid";

interface EngineSettings {
  solids: Solid[];
  constraints: Constraint[];

  timeStep: 0.1;
  gravity: number;
}

export class Engine {
  solids: Solid[];
  constraints: Constraint[];
  timeStep: number;
  gravity: number;
  initialized: boolean;
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
    this.solids.forEach(s => (s.speed = MathJs.zeros(3, 1) as Matrix));
    this.solids.forEach(s => (s.rotation = MathJs.zeros(3, 1) as Matrix));
    this.solids.forEach(s => (s.rotationalSpeed = MathJs.zeros(3, 1) as Matrix));

    this.initialized = true;
  }

  private applySumOfForces() {
    const equations: Equation[] = [];
    // the sum of the forces will be equal to the acceleration times the mass

    for (const solid of this.solids) {
      const constraintsOfThisSolid = this.constraints.filter(i => i.object1 === solid || i.object2 === solid);

      equations.push({
        rightSide: 0,
        terms: [
          {
            unknownFactor: "d²x/dt",
            value: solid.mass,
            element: solid
          },
          ...constraintsOfThisSolid.map(
            c =>
              ({
                unknownFactor: "xforce",
                value: c.object1 === solid ? 1 : -1,
                element: c
              } as EquationTerm)
          )
        ]
      });

      equations.push({
        rightSide: solid.mass * this.gravity,
        terms: [
          {
            unknownFactor: "d²y/dt",
            value: solid.mass,
            element: solid
          },
          ...constraintsOfThisSolid.map(
            c =>
              ({
                unknownFactor: "yforce",
                value: c.object1 === solid ? 1 : -1,
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
        rightSide: solid.mass * this.gravity,
        terms: [
          {
            unknownFactor: "d²w/dt",
            value: solid.inertia.subset(MathJs.index(2, 2)) as any,
            element: solid
          },
          ...constraintsOfThisSolid.map(c => {
            if (c.object1 === solid) {
              const force = rotateVectorAlongZ(solid.rotation.subset(MathJs.index(2, 0)) as any, c.object1Position);
              return {
                unknownFactor: "xforce",
                value: force.subset(MathJs.index(0, 1)) as any,
                element: c
              } as EquationTerm;
            } else {
              const force = rotateVectorAlongZ(solid.rotation.subset(MathJs.index(2, 0)) as any, c.object2Position);
              return {
                unknownFactor: "xforce",
                value: -force.subset(MathJs.index(0, 1)) as any,
                element: c
              } as EquationTerm;
            }
          }),
          ...constraintsOfThisSolid.map(c => {
            if (c.object1 === solid) {
              const force = rotateVectorAlongZ(solid.rotation.subset(MathJs.index(2, 0)) as any, c.object1Position);
              return {
                unknownFactor: "yforce",
                value: force.subset(MathJs.index(0, 0)) as any,
                element: c
              } as EquationTerm;
            } else {
              const force = rotateVectorAlongZ(solid.rotation.subset(MathJs.index(2, 0)) as any, c.object2Position);
              return {
                unknownFactor: "yforce",
                value: -force.subset(MathJs.index(0, 0)) as any,
                element: c
              } as EquationTerm;
            }
          })
        ]
      });
      return equations;
    }
  }

  private addPivotRelationshipInner(chain: ChainOfSolid) {
    let equations: Equation[] = [];

    // aG = aP/R + d²w/dt² ^ PG + dw/dt ^ dPG/dt

    const xTerms : EquationTerm[] = [{
        element : chain.element, 
        unknownFactor: 'd²x/dt',
        value: 1
    }, {
        
    }];

    const getParentsConstraints: (a: ChainOfSolid) => Constraint[] = (a: ChainOfSolid) =>
      a.parentConstraint ? [a.parentConstraint, ...getParentsConstraints(a.parent)] : [a.parentConstraint];
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

  private addPivotRelationships() {
    const pivotLinkedToGround = this.constraints.filter(i => i instanceof Pivot).find(i => !i.object2);
    if (!pivotLinkedToGround) {
      throw new Error("Could not a find a constraint that linked the structure to the ground");
    }

    return this.addPivotRelationshipInner({ parentConstraint: pivotLinkedToGround, element: pivotLinkedToGround.object1 });
  }

  private runChecks() {
    const solidWithNoConstraint = this.solids.find(s => !this.constraints.find(c => c.object1 === s || c.object2 === s));
    if (solidWithNoConstraint) {
      throw Error('Solid "' + solidWithNoConstraint.name + '" had no constraint. This is not supported');
    }
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
  }
}
