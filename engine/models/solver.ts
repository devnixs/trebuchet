import { Matrix, zeros as emptyMatrix, index as MathJsIndex, multiply, inv as inverseMatrix } from "mathjs";
import { Equation, EquationTerm } from "./equation";
import lodash from "lodash";

export class Solver {
  constructor(private equations: Equation[]) {}

  createUnknownId(term: EquationTerm) {
    return term.unknownFactor + "-->" + (term.element ? term.element.name : 'none');
  }

  solve() {
    // let's build a matrix out of the equations

    var unknowns = lodash.flatten(this.equations.map(i => i.terms));
    var uniqueUnknowns = lodash.uniqBy(
      unknowns.filter(i => i.unknownFactor !== "none"),
      i => this.createUnknownId(i)
    );

    if (uniqueUnknowns.length > this.equations.length) {
      throw new Error("System has more unknowns than equations");
    }

    if (uniqueUnknowns.length > this.equations.length) {
      throw new Error("System is overconstrained");
    }

    var equationMatrix = emptyMatrix(this.equations.length, uniqueUnknowns.length) as Matrix;
    const constantsMatrix = emptyMatrix(this.equations.length, 1) as Matrix;

    for (let equationIndex = 0; equationIndex < this.equations.length; equationIndex++) {
      const equation = this.equations[equationIndex];
      for (let unknownIndex = 0; unknownIndex < uniqueUnknowns.length; unknownIndex++) {
        const unknown = uniqueUnknowns[unknownIndex];

        const coefficients = equation.terms.filter(i => this.createUnknownId(i) === this.createUnknownId(unknown));
        const coefficient = lodash.sumBy(coefficients, i => i.value);
        equationMatrix.subset(MathJsIndex(equationIndex, unknownIndex), coefficient);
      }

      const constants = equation.terms.filter(i => i.unknownFactor === "none");
      const constantSum = lodash.sumBy(constants, i => i.value);
      constantsMatrix.subset(MathJsIndex(equationIndex, 0), constantSum);
    }

    let inversedMatrix: Matrix;
    try {
      inversedMatrix = inverseMatrix(equationMatrix);
    } catch (e) {
      console.error("Could not find solutions to this system", e);
      throw e;
    }

    const test = multiply(inversedMatrix, equationMatrix);

    const solutionVector = multiply(inversedMatrix, constantsMatrix);

    return uniqueUnknowns.map((u, index) => ({
      unknown: u.unknownFactor,
      value: solutionVector.subset(MathJsIndex(index, 0)) as any as number,
      element: u.element
    }));
  }
}
