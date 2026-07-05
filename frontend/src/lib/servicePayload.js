/**
 * Build POST/PATCH body for salon services (matches mobile ManageServicesScreen).
 * Omits invalid empty strings that cause FastAPI 422 validation errors.
 */
export function buildServicePayload(data, categoriesExist = false) {
  const priceNum = parseFloat(data.price);
  const duration = parseInt(String(data.duration), 10);

  if (!data.name?.trim() || Number.isNaN(priceNum) || priceNum <= 0 || Number.isNaN(duration) || duration <= 0) {
    return null;
  }

  if (categoriesExist && !data.category_id) {
    return null;
  }

  const category_id = data.category_id || null;

  const base = {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    duration,
    image_url: data.image_url || undefined,
    is_on_offer: Boolean(data.is_on_offer),
    category_id,
  };

  if (data.is_on_offer && data.discount_percentage != null && data.discount_percentage !== '') {
    const disc = parseInt(String(data.discount_percentage), 10);
    if (Number.isNaN(disc) || disc < 1 || disc > 99) {
      return null;
    }
    const roundedOriginal = Math.round(priceNum);
    const payload = {
      ...base,
      original_price: roundedOriginal,
      price: Math.round(priceNum * (1 - disc / 100)),
      discount_percentage: disc,
    };
    if (data.offer_end_date) {
      payload.offer_end_date = data.offer_end_date;
    }
    if (data.offer_tagline?.trim()) {
      payload.offer_tagline = data.offer_tagline.trim();
    }
    return payload;
  }

  return {
    ...base,
    price: Math.round(priceNum),
    is_on_offer: false,
  };
}
