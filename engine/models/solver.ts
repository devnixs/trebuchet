import { Matrix, multiply, inv as inverseMatrix } from "mathjs";
import * as MathJs from "mathjs";
import { Equation, EquationTerm, Solution } from "./equation";
import lodash from "lodash";
import { emptyMatrix } from "../../utils/matrix-utils";
import { invertMatrix } from "../../utils/invert-matrix";

export class Solver {
  constructor(private equations: Equation[]) {}

  createUnknownId(term: EquationTerm) {
    return term.unknownFactor + "-->" + (term.element ? term.element.name : "none");
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

    var equationMatrix = emptyMatrix(this.equations.length, uniqueUnknowns.length) as number[][];
    const constantsMatrix = emptyMatrix(this.equations.length, 1) as number[][];

    for (let equationIndex = 0; equationIndex < this.equations.length; equationIndex++) {
      const equation = this.equations[equationIndex];
      for (let unknownIndex = 0; unknownIndex < uniqueUnknowns.length; unknownIndex++) {
        const unknown = uniqueUnknowns[unknownIndex];

        const coefficients = equation.terms.filter(i => this.createUnknownId(i) === this.createUnknownId(unknown));
        const coefficient = lodash.sumBy(coefficients, i => i.value);
        equationMatrix[equationIndex][unknownIndex] = coefficient;
      }

      const constants = equation.terms.filter(i => i.unknownFactor === "none");
      const constantSum = lodash.sumBy(constants, i => i.value);
      constantsMatrix[equationIndex][0] = constantSum;
    }

    let inversedMatrix: number[][];
    let inversedMatrix2: number[][];
    try {
      inversedMatrix = MathJs.inv(equationMatrix);
      inversedMatrix2 = invertMatrix(equationMatrix);
      // console.log(inversedMatrix, inversedMatrix2);
    } catch (e) {
      console.error("System is hyperstatic", e);
      throw e;
    }

    const test1 = MathJs.multiply(inversedMatrix, equationMatrix);
    const test2 = MathJs.multiply(inversedMatrix2, equationMatrix);
    console.log(test2);
    //console.log(test1, test2);
    const solutionVector1 = MathJs.multiply(inversedMatrix, constantsMatrix);
    const solutionVector2 = MathJs.multiply(inversedMatrix2, constantsMatrix);

    return uniqueUnknowns.map(
      (u, index) =>
        ({
          unknown: u.unknownFactor,
          value: solutionVector2[index][0],
          element: u.element
        } as Solution)
    );
  }
}
