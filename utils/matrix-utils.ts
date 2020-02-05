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
