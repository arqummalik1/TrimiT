import { describe, it, expect } from 'vitest';
import { buildExploreSearchParams, explorePath } from '../../src/config/jammu';
import { audienceExplorePath, MARKET_AUDIENCE_OPTIONS } from '../../src/config/marketAudience';

describe('marketAudience', () => {
  it('builds explore paths with gender filter', () => {
    const men = MARKET_AUDIENCE_OPTIONS.find((o) => o.id === 'men');
    expect(explorePath({ gender_serve: 'women' })).toContain('gender_serve=women');
    expect(audienceExplorePath(men)).toContain('gender_serve=men');
  });

  it('includes coords in explore search params', () => {
    const params = buildExploreSearchParams({ gender_serve: 'men', q: 'haircut' });
    expect(params.get('gender_serve')).toBe('men');
    expect(params.get('q')).toBe('haircut');
    expect(params.get('lat')).toBeTruthy();
  });
});
