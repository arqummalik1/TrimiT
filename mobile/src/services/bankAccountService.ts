import apiClient from './apiClient';

/** PayU vendor lifecycle state (Req 3.5, 17.6). */
export type VendorStatus =
  | 'not_registered'
  | 'pending'
  | 'active'
  | 'rejected'
  | 'suspended';

/**
 * Masked Bank_KYC_Record returned by the canonical `/owner/bank-accounts`
 * endpoint. Full account number, PAN, and GSTIN are NEVER returned — only the
 * last four digits of the account number / PAN are exposed (Req 1.6).
 */
export interface BankAccount {
  id: string;
  salon_id: string;
  account_name: string;
  account_number_last4: string;
  ifsc_code: string;
  // KYC (masked / non-sensitive projections, additive optional fields)
  pan_last4?: string | null;
  business_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address_line?: string | null;
  pincode?: string | null;
  // PayU vendor lifecycle
  vendor_status: VendorStatus;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Full Bank_KYC_Record submission (Req 1.2, 1.3). Sensitive fields (full
 * account number, PAN, GSTIN) are sent in full over HTTPS and stored encrypted
 * at rest server-side; they are never echoed back.
 */
export interface BankAccountCreate {
  account_name: string;
  account_number: string;
  ifsc_code: string;
  pan: string;
  business_name: string;
  contact_phone: string;
  contact_email: string;
  address_line: string;
  pincode: string;
  gstin?: string;
}

export const bankAccountService = {
  async getBankAccount(): Promise<BankAccount | null> {
    try {
      const response = await apiClient.get('/owner/bank-accounts');
      return response.data;
    } catch (error: unknown) {
      const status =
        (error as { status?: number }).status ??
        (error as { response?: { status?: number } }).response?.status;
      if (status === 404) {
        return null;
      }
      throw error;
    }
  },

  async saveBankAccount(data: BankAccountCreate): Promise<BankAccount> {
    const response = await apiClient.post('/owner/bank-accounts/', data);
    return response.data;
  },
};
