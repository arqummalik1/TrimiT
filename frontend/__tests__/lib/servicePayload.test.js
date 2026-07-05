import { describe, it, expect } from 'vitest';
import { buildServicePayload } from '../../src/lib/servicePayload';

describe('buildServicePayload', () => {
  const base = {
    name: 'Haircut',
    description: '',
    price: '500',
    duration: 30,
    is_on_offer: false,
  };

  it('returns payload with price and duration', () => {
    const payload = buildServicePayload(base);
    expect(payload).toMatchObject({ name: 'Haircut', price: 500, duration: 30 });
  });

  it('requires category_id when categories exist', () => {
    expect(buildServicePayload(base, true)).toBeNull();
    expect(buildServicePayload({ ...base, category_id: 'cat-1' }, true)).toMatchObject({
      category_id: 'cat-1',
    });
  });

  it('allows missing category_id when no categories exist', () => {
    const payload = buildServicePayload(base, false);
    expect(payload?.category_id).toBeNull();
  });
});
