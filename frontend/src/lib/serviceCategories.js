/** Group services by salon category for menu-style UIs (Zomato/Swiggy pattern). */

export const UNCATEGORIZED_LABEL = 'Other';

/**
 * @param {Array<{ id: string; category_id?: string | null; [key: string]: unknown }>} services
 * @param {Array<{ id: string; name: string; sort_order?: number; active?: boolean }>} categories
 */
export function groupServicesByCategory(services = [], categories = []) {
  const sortedCats = [...categories]
    .filter((c) => c.active !== false)
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        String(a.name).localeCompare(String(b.name)),
    );

  const byCategory = new Map();
  const uncategorized = [];

  for (const svc of services) {
    if (svc.category_id) {
      const list = byCategory.get(svc.category_id) ?? [];
      list.push(svc);
      byCategory.set(svc.category_id, list);
    } else {
      uncategorized.push(svc);
    }
  }

  const sections = sortedCats
    .map((cat) => ({
      title: cat.name,
      categoryId: cat.id,
      data: byCategory.get(cat.id) ?? [],
    }))
    .filter((s) => s.data.length > 0);

  if (uncategorized.length > 0) {
    sections.push({
      title: UNCATEGORIZED_LABEL,
      categoryId: null,
      data: uncategorized,
    });
  }

  return sections;
}
