export type Coordinate = { row: number; col: number };
export function cells(
  row: number,
  col: number,
  length: number,
  vertical: boolean,
): Coordinate[] {
  return Array.from({ length }, (_, i) => ({
    row: row + (vertical ? i : 0),
    col: col + (vertical ? 0 : i),
  }));
}
export const coordinateKey = (p: Coordinate) => `${p.row}:${p.col}`;
export const sameCoordinate = (a: Coordinate, b: Coordinate) =>
  a.row === b.row && a.col === b.col;
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}
