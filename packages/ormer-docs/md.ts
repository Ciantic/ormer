/**
 * Converts multiline markdown template string into a properly formatted markdown string, by:
 * - Removing leading indentation (based on the first non-empty line)
 * - Trimming leading and trailing empty lines
 */
export function md(strings: TemplateStringsArray, ...values: any[]) {
  // Combine strings and values into a single string
  const raw = strings.reduce(
    (acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ""),
    "",
  );

  // Split into lines
  const lines = raw.split("\n");

  // Find indentation of the first non-empty line (this is the template content indent)
  const baseIndent =
    lines.reduce(
      (found, line) => {
        if (found !== undefined) return found;
        if (line.trim().length === 0) return undefined;
        const match = line.match(/^(\s*)/);
        return match?.[1]?.length ?? 0;
      },
      undefined as number | undefined,
    ) ?? 0;

  // Strip at most baseIndent spaces from each line, then trim leading/trailing empty lines
  const stripped = lines
    .map((line) => {
      const match = line.match(/^(\s*)/);
      const indent = match?.[1]?.length ?? 0;
      const strip = Math.min(baseIndent, indent);
      return line.slice(strip);
    })
    .join("\n")
    .trim();

  return stripped;
}
