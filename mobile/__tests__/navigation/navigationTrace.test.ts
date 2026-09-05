import { summarizeNavigationState } from '../../src/navigation/navigationTrace';

describe('navigationTrace', () => {
  it('logs screen names without copying route params', () => {
    const summary = summarizeNavigationState({
      index: 1,
      routes: [
        { name: 'CustomerTabs' },
        {
          name: 'Auth',
          state: {
            index: 1,
            routes: [{ name: 'Login' }, { name: 'VerifyOtp' }],
          },
        },
      ],
    });

    expect(summary).toEqual({
      rootRoutes: ['CustomerTabs', 'Auth'],
      activePath: ['Auth', 'VerifyOtp'],
    });
    expect(JSON.stringify(summary)).not.toContain('email');
  });
});
