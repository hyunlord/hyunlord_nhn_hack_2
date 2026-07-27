export function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) {
    return null;
  }
  if (sorted.length % 2 === 1) {
    return upper;
  }
  const lower = sorted[middle - 1];
  return lower === undefined ? null : (lower + upper) / 2;
}

export function displayMedian(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export function rate(count: number, total: number): string {
  return total === 0 ? "—" : `${((count / total) * 100).toFixed(1)}%`;
}

export function average(values: readonly number[]): number | null {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function displayAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

export function table(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => row[index]?.length ?? 0),
    ),
  );
  const render = (row: readonly string[]) =>
    row
      .map((cell, index) => cell.padEnd(widths[index] ?? 0))
      .join(" | ");
  return [
    render(headers),
    widths.map((width) => "-".repeat(width)).join("-|-"),
    ...rows.map(render),
  ].join("\n");
}
