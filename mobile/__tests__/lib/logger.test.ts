jest.mock('../../src/lib/buildConfig', () => ({
  buildConfig: { sentryDsn: undefined },
}));

import { logger } from '../../src/lib/logger';

describe('release diagnostics', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps debug and info output silent, including during local development', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    logger.debug('navigation test', { screen: 'Login' });
    logger.info('booking test', { count: 0 });

    expect(log).not.toHaveBeenCalled();
  });

  it('preserves operational warnings and errors', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('test failure');

    logger.warn('test warning', { code: 'TEST' });
    logger.error('test error', failure);

    expect(warn).toHaveBeenCalledWith('[WARN] test warning', { code: 'TEST' });
    expect(error).toHaveBeenCalledWith('[ERROR] test error', failure);
  });
});
