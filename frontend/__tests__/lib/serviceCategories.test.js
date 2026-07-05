import { describe, it, expect } from 'vitest';
import { groupServicesByCategory, UNCATEGORIZED_LABEL } from '../../src/lib/serviceCategories';

describe('groupServicesByCategory', () => {
  const categories = [
    { id: 'c1', name: 'Hair', sort_order: 0, active: true },
    { id: 'c2', name: 'Face', sort_order: 1, active: true },
  ];

  const services = [
    { id: 's1', name: 'Cut', category_id: 'c1', price: 100 },
    { id: 's2', name: 'Facial', category_id: 'c2', price: 200 },
  ];

  it('groups services under category headings', () => {
    const sections = groupServicesByCategory(services, categories);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('Hair');
    expect(sections[0].data).toHaveLength(1);
  });

  it('puts uncategorized services in Other', () => {
    const sections = groupServicesByCategory(
      [{ id: 's3', name: 'Misc', category_id: null, price: 50 }],
      categories,
    );
    expect(sections.some((s) => s.title === UNCATEGORIZED_LABEL)).toBe(true);
  });

  it('omits empty category sections', () => {
    const sections = groupServicesByCategory([services[0]], categories);
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Hair');
  });
});
