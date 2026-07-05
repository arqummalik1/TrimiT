import { groupServicesByCategory } from '../../src/lib/serviceCategories';
import type { Service, ServiceCategory } from '../../src/types';

describe('groupServicesByCategory', () => {
  const categories: ServiceCategory[] = [
    { id: 'c1', salon_id: 's1', name: 'Hair', sort_order: 0, active: true },
    { id: 'c2', salon_id: 's1', name: 'Face', sort_order: 1, active: true },
  ];

  const services: Service[] = [
    {
      id: 'svc1',
      salon_id: 's1',
      name: 'Cut',
      price: 100,
      duration: 30,
      category_id: 'c1',
      created_at: '',
    },
    {
      id: 'svc2',
      salon_id: 's1',
      name: 'Facial',
      price: 200,
      duration: 45,
      category_id: 'c2',
      created_at: '',
    },
  ];

  it('groups services under category headings', () => {
    const sections = groupServicesByCategory(services, categories);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe('Hair');
    expect(sections[0].data).toHaveLength(1);
  });

  it('puts uncategorized services in Other', () => {
    const sections = groupServicesByCategory(
      [{ ...services[0], category_id: null }],
      categories,
    );
    expect(sections.some((s) => s.title === 'Other')).toBe(true);
  });
});
