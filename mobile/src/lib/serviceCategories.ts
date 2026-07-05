/** Group services by salon category for SectionList UIs. */
import type { Service, ServiceCategory } from '../types';

export const UNCATEGORIZED_LABEL = 'Other';

export interface ServiceSection {
  title: string;
  categoryId: string | null;
  data: Service[];
}

export function groupServicesByCategory(
  services: Service[],
  categories: ServiceCategory[] = [],
): ServiceSection[] {
  const sortedCats = [...categories]
    .filter((c) => c.active !== false)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const byCategory = new Map<string, Service[]>();
  const uncategorized: Service[] = [];

  for (const svc of services) {
    if (svc.category_id) {
      const list = byCategory.get(svc.category_id) ?? [];
      list.push(svc);
      byCategory.set(svc.category_id, list);
    } else {
      uncategorized.push(svc);
    }
  }

  const sections: ServiceSection[] = sortedCats
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
