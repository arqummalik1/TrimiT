/**
 * Unit tests for promotionRepository + promotionService.
 *
 * The repository is a thin pass-through to the service, and the service wraps
 * apiClient. We test the service against a mocked apiClient (verifies the exact
 * HTTP verb + path + data-unwrapping), and the repository against a mocked
 * service (verifies delegation).
 */

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import apiClient from '../src/services/apiClient';
import { promotionService } from '../src/services/promotionService';

const mockedApi = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => jest.clearAllMocks());

describe('promotionService', () => {
  it('getOwnerPromotions GETs /promotions/owner and unwraps data', async () => {
    mockedApi.get.mockResolvedValue({ data: [{ id: 'p1' }] } as any);

    const result = await promotionService.getOwnerPromotions();

    expect(mockedApi.get).toHaveBeenCalledWith('/promotions/owner');
    expect(result).toEqual([{ id: 'p1', max_uses: null, used_count: 0 }]);
  });

  it('createPromotion POSTs /promotions/ with the payload', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'p2' } } as any);

    const result = await promotionService.createPromotion({
      code: 'SAVE10',
      discount_type: 'percentage',
      discount_value: 10,
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/promotions/', {
      code: 'SAVE10',
      discount_type: 'percentage',
      discount_value: 10,
    });
    expect(result).toEqual({ id: 'p2', max_uses: null, used_count: 0 });
  });

  it('updatePromotion PATCHes /promotions/:id', async () => {
    mockedApi.patch.mockResolvedValue({ data: { id: 'p1', active: false } } as any);

    const result = await promotionService.updatePromotion('p1', { active: false });

    expect(mockedApi.patch).toHaveBeenCalledWith('/promotions/p1', { active: false });
    expect(result).toEqual({ id: 'p1', active: false, max_uses: null, used_count: 0 });
  });

  it('deletePromotion DELETEs /promotions/:id and resolves void', async () => {
    mockedApi.delete.mockResolvedValue({ data: null } as any);

    await expect(promotionService.deletePromotion('p1')).resolves.toBeUndefined();
    expect(mockedApi.delete).toHaveBeenCalledWith('/promotions/p1');
  });

  it('validatePromoCode POSTs /promotions/validate and returns the verdict', async () => {
    mockedApi.post.mockResolvedValue({
      data: { valid: true, discount_amount: 50, final_amount: 450 },
    } as any);

    const result = await promotionService.validatePromoCode({
      code: 'SAVE10',
      salon_id: 's1',
      booking_amount: 500,
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/promotions/validate', {
      code: 'SAVE10',
      salon_id: 's1',
      booking_amount: 500,
    });
    expect(result).toEqual({ valid: true, discount_amount: 50, final_amount: 450 });
  });

  it('validatePromoCode surfaces an invalid verdict from the API', async () => {
    mockedApi.post.mockResolvedValue({
      data: { valid: false, error: 'Code expired' },
    } as any);

    const result = await promotionService.validatePromoCode({
      code: 'OLD',
      salon_id: 's1',
      booking_amount: 500,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Code expired');
  });
});

describe('promotionRepository (delegation)', () => {
  // Reset modules so we can re-mock the service layer specifically for the
  // repository's delegation contract.
  jest.resetModules();

  jest.doMock('../src/services/promotionService', () => ({
    promotionService: {
      getOwnerPromotions: jest.fn().mockResolvedValue([{ id: 'p1' }]),
      createPromotion: jest.fn().mockResolvedValue({ id: 'p2' }),
      updatePromotion: jest.fn().mockResolvedValue({ id: 'p1' }),
      deletePromotion: jest.fn().mockResolvedValue(undefined),
      validatePromoCode: jest.fn().mockResolvedValue({ valid: true }),
    },
  }));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { promotionRepository } = require('../src/repositories/promotionRepository');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { promotionService: svc } = require('../src/services/promotionService');

  it('forwards validatePromoCode to the service', async () => {
    const data = { code: 'SAVE10', salon_id: 's1', booking_amount: 500 };
    const result = await promotionRepository.validatePromoCode(data);

    expect(svc.validatePromoCode).toHaveBeenCalledWith(data);
    expect(result).toEqual({ valid: true });
  });

  it('forwards createPromotion to the service', async () => {
    await promotionRepository.createPromotion({ code: 'NEW' });
    expect(svc.createPromotion).toHaveBeenCalledWith({ code: 'NEW' });
  });
});
