import MathJs, { Matrix } from "mathjs";
import { Equation, EquationTerm } from "./equation";
import lodash from "lodash";

export class SolutionMatrix {
  constructor(private equations: Equation[]) {}

  createUnknownId(term: EquationTerm) {
    return term.unknownFactor + "-->" + term.element.name;
  }

  solve() {
    // let's build a matrix out of the equations

    var unknowns = lodash.flatten(this.equations.map(i => i.terms));
    var uniqueUnknowns = lodash.uniqBy(
      unknowns.filter(i => i.unknownFactor !== "none"),
      i => this.createUnknownId
    );

    if (uniqueUnknowns.length > this.equations.length) {
      throw new Error("System has more unknowns than equations");
    }

    if (uniqueUnknowns.length > this.equations.length) {
      throw new Error("System is overconstraint");
    }

    var equationMatrix = MathJs.zeros(this.equations.length, uniqueUnknowns.length) as Matrix;
    const constantsMatrix = MathJs.zeros(this.equations.length, 1) as Matrix;

    for (let equationIndex = 0; equationIndex < this.equations.length; equationIndex++) {
      const equation = this.equations[equationIndex];
      for (let unknownIndex = 0; unknownIndex < uniqueUnknowns.length; unknownIndex++) {
        const unknown = uniqueUnknowns[unknownIndex];

        const coefficients = equation.terms.filter(i => this.createUnknownId(i) === this.createUnknownId(unknown));
        const coefficient = lodash.sumBy(coefficients, i => i.value);
        equationMatrix.subset(MathJs.index(equationIndex, unknownIndex), coefficient);
      }

      const constants = equation.terms.filter(i => i.unknownFactor === "none");
      const constantSum = lodash.sumBy(constants, i => i.value);
      constantsMatrix.subset(MathJs.index(equationIndex, 0), constantSum);
    }

    let inverseMatrix: Matrix;
    try {
      inverseMatrix = MathJs.inv(equationMatrix);
    } catch (e) {
      console.error("Could not find solutions to this system", e);
      throw e;
    }

    const solutionVector = MathJs.multiply(inverseMatrix, constantsMatrix);

    return uniqueUnknowns.map((u, index) => ({
      unknown: u.unknownFactor,
      value: solutionVector.subset(MathJs.index(index, 0)),
      element: u.element
    }));
  }
}
