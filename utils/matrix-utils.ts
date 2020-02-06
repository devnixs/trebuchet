export function emptyMatrix(rows: number, columns: number) {
  var matrix1: number[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < columns; j++) {
      row.push(0);
    }
    matrix1.push(row);
  }
  return matrix1;
}

export function matrixDeterminant(matrix: number[][]) {
  let positiveSum = 0;
  const matrixSize = matrix.length;
  for (let i = 0; i < matrixSize; i++) {
    let product = 1;
    for (let j = 0; j < matrixSize; j++) {
      product = product * matrix[(i + j) % matrixSize][j];
    }
    positiveSum += product;
  }

  let negativeSum = 0;
  for (let i = 0; i < matrixSize; i++) {
    let product = 1;
    for (let j = 0; j < matrixSize; j++) {
      product = product * matrix[j][(2 * matrixSize - (i + j) - 1) % matrixSize];
    }
    negativeSum -= product;
  }

  const total = positiveSum + negativeSum;
  return total;
}