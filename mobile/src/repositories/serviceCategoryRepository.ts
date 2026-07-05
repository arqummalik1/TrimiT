import { serviceCategoryService } from '../services/serviceCategoryService';
import { ServiceCategory } from '../types';

export const serviceCategoryRepository = {
  list: (): Promise<ServiceCategory[]> => serviceCategoryService.list(),
  getPresets: () => serviceCategoryService.getPresets(),
  create: (payload: { name: string }) => serviceCategoryService.create(payload),
  quickStart: () => serviceCategoryService.quickStart(),
  update: (id: string, payload: { name?: string }) => serviceCategoryService.update(id, payload),
  delete: (id: string) => serviceCategoryService.delete(id),
};
