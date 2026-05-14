export const DEFAULT_DEPARTMENTS = [
  "PCB",
  "Firmware",
  "AI",
  "Operations",
  "Graphic Design",
  "Sales",
  "Web Development",
] as const;

const DEFAULT_ORDER = new Map(DEFAULT_DEPARTMENTS.map((name, index) => [name.toLowerCase(), index]));

export function normalizeDepartmentName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

export function slugifyDepartment(name: string) {
  return normalizeDepartmentName(name)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sortDepartmentNames(names: string[]) {
  return Array.from(new Set(names.map(normalizeDepartmentName).filter(Boolean))).sort((a, b) => {
    const aOrder = DEFAULT_ORDER.get(a.toLowerCase());
    const bOrder = DEFAULT_ORDER.get(b.toLowerCase());
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return a.localeCompare(b);
  });
}
