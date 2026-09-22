/**
 * Keeps an empty numeric field distinct from an explicit zero in React Hook Form.
 * Numeric HTML inputs send strings; Zod receives either a valid integer or undefined.
 */
export function toOptionalInteger(value: unknown): number | undefined {
  if (value === "" || value === undefined || value === null) return undefined;
  const rawValue = typeof value === "string" ? value.trim() : value;
  const normalizedValue = typeof rawValue === "string" && /^rp\s*/i.test(rawValue)
    ? rawValue.replace(/^rp\s*/i, "").replace(/[.\s,]/g, "")
    : rawValue;
  const parsed = typeof normalizedValue === "number" ? normalizedValue : Number(normalizedValue);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Runtime-empty default for required numeric fields before Zod validation runs. */
export const emptyNumericValue = undefined as unknown as number;
