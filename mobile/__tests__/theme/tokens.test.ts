import { typography } from '../../src/theme/tokens';

describe('typography.tabTitle', () => {
  it('is slightly larger than h3 for customer tab screen headings', () => {
    expect(typography.tabTitle.fontSize).toBe(typography.h3.fontSize + 2);
    expect(typography.tabTitle.fontFamily).toBe(typography.h3.fontFamily);
  });
});
