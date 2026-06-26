import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Bank, CheckCircle, Receipt, WarningCircle } from '@phosphor-icons/react';
import { useBankAccount, useSaveBankAccount } from '../../hooks/useBankAccount';
import { getApiErrorMessage, formatPrice } from '../../lib/utils';

// Validation mirrors the backend patterns (Req 1.8, 1.9, 1.2).
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

// Fee economics disclosed to the owner (Req 7.7, 17.3).
const TRIMIT_PERCENT = 5;
const GATEWAY_PERCENT = 2;
const TOTAL_DEDUCTION_PERCENT = TRIMIT_PERCENT + GATEWAY_PERCENT;
const NET_PERCENT = 100 - TOTAL_DEDUCTION_PERCENT;
const EXAMPLE_AMOUNT = 1000;

const VENDOR_STATUS_LABEL = {
  not_registered: 'Payouts: pending activation',
  pending: 'Payouts: pending activation',
  active: 'Payouts: active',
  rejected: 'Payouts: action needed',
  suspended: 'Payouts: suspended',
};

const EMPTY_FORM = {
  account_name: '',
  account_number: '',
  confirm_account_number: '',
  ifsc_code: '',
  confirm_ifsc_code: '',
  pan: '',
  business_name: '',
  contact_phone: '',
  contact_email: '',
  address_line: '',
  pincode: '',
  gstin: '',
};

const inputClass =
  'w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-shadow';

const Field = ({ id, label, value, onChange, error, ...rest }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label}
    </label>
    <input
      id={id}
      value={value}
      onChange={onChange}
      className={`${inputClass} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`}
      {...rest}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const BankAccountPage = () => {
  const { data: bankAccount, isLoading } = useBankAccount();
  const saveMutation = useSaveBankAccount();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Prefill non-sensitive fields from the masked record.
  useEffect(() => {
    if (bankAccount) {
      setForm((prev) => ({
        ...prev,
        account_name: bankAccount.account_name ?? prev.account_name,
        ifsc_code: bankAccount.ifsc_code ?? prev.ifsc_code,
        confirm_ifsc_code: bankAccount.ifsc_code ?? prev.confirm_ifsc_code,
        business_name: bankAccount.business_name ?? prev.business_name,
        contact_phone: bankAccount.contact_phone ?? prev.contact_phone,
        contact_email: bankAccount.contact_email ?? prev.contact_email,
        address_line: bankAccount.address_line ?? prev.address_line,
        pincode: bankAccount.pincode ?? prev.pincode,
      }));
    }
  }, [bankAccount]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const validate = () => {
    const next = {};
    const ifsc = form.ifsc_code.trim().toUpperCase();
    const pan = form.pan.trim().toUpperCase();
    const gstin = form.gstin.trim().toUpperCase();

    if (!form.account_name.trim()) next.account_name = 'Enter the account holder name.';
    if (!form.account_number.trim()) next.account_number = 'Enter the account number.';
    if (form.account_number !== form.confirm_account_number) {
      next.confirm_account_number = 'Account numbers do not match.';
    }
    if (!IFSC_REGEX.test(ifsc)) next.ifsc_code = 'Invalid IFSC. Example: HDFC0001234.';
    else if (ifsc !== form.confirm_ifsc_code.trim().toUpperCase()) {
      next.confirm_ifsc_code = 'IFSC codes do not match.';
    }
    if (!PAN_REGEX.test(pan)) next.pan = 'Invalid PAN. Example: ABCDE1234F.';
    if (!form.business_name.trim()) next.business_name = 'Enter the business or legal name.';
    if (!form.contact_phone.trim()) next.contact_phone = 'Enter a contact phone number.';
    if (!EMAIL_REGEX.test(form.contact_email.trim())) next.contact_email = 'Enter a valid email address.';
    if (!form.address_line.trim()) next.address_line = 'Enter the registered address.';
    if (!PINCODE_REGEX.test(form.pincode.trim())) next.pincode = 'Enter a valid 6-digit pincode.';
    if (gstin && !GSTIN_REGEX.test(gstin)) next.gstin = 'Invalid GSTIN.';

    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError('Please fix the highlighted fields.');
      return;
    }

    const payload = {
      account_name: form.account_name.trim(),
      account_number: form.account_number.trim(),
      ifsc_code: form.ifsc_code.trim().toUpperCase(),
      pan: form.pan.trim().toUpperCase(),
      business_name: form.business_name.trim(),
      contact_phone: form.contact_phone.trim(),
      contact_email: form.contact_email.trim(),
      address_line: form.address_line.trim(),
      pincode: form.pincode.trim(),
      ...(form.gstin.trim() ? { gstin: form.gstin.trim().toUpperCase() } : {}),
    };

    saveMutation.mutate(payload, {
      onSuccess: () => {
        setSuccess(true);
        setForm((prev) => ({
          ...prev,
          account_number: '',
          confirm_account_number: '',
          pan: '',
          gstin: '',
        }));
      },
      onError: (err) => {
        setFormError(getApiErrorMessage(err, 'Failed to save payout details.'));
      },
    });
  };

  const vendorStatus = bankAccount?.vendor_status ?? 'not_registered';
  const showBadge = !!bankAccount && vendorStatus !== 'active';
  const netExample = useMemo(() => Math.round((EXAMPLE_AMOUNT * NET_PERCENT) / 100), []);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="animate-pulse h-10 w-40 bg-gray-100 rounded-lg mb-6" />
        <div className="animate-pulse h-28 bg-gray-100 rounded-2xl mb-4" />
        <div className="animate-pulse h-96 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <Link
        to="/owner/settings"
        className="inline-flex items-center gap-2 text-gray-600 mb-6 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={20} /> Back to settings
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payout Details</h1>
        <p className="text-gray-600">
          Add your bank and KYC details to receive automatic settlements from customer payments.
        </p>
      </div>

      {showBadge && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 px-3 py-1.5 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          {VENDOR_STATUS_LABEL[vendorStatus]}
        </div>
      )}

      {/* Deduction disclosure (Req 7.7, 17.3) */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-teal-50/60 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Receipt size={20} weight="fill" className="text-teal-700" />
          <h2 className="text-base font-bold text-gray-900">Payout deduction</h2>
        </div>
        <p className="text-sm text-gray-700">
          Total ~{TOTAL_DEDUCTION_PERCENT}% deducted per booking ({TRIMIT_PERCENT}% TrimiT +{' '}
          {GATEWAY_PERCENT}% payment gateway). You receive ~{NET_PERCENT}%.
        </p>
        <p className="mt-1 text-sm font-semibold text-gray-900">
          Example: on a {formatPrice(EXAMPLE_AMOUNT)} booking you receive ~{formatPrice(netExample)}.
        </p>
      </div>

      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 text-green-700 px-4 py-3 text-sm">
          <CheckCircle size={18} weight="fill" /> Payout details saved successfully.
        </div>
      )}

      {formError && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
          <WarningCircle size={18} weight="fill" /> {formError}
        </div>
      )}

      {bankAccount && (
        <div className="mb-6 rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Bank size={22} weight="fill" className="text-teal-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Saved account</h3>
              <p className="text-sm text-gray-500">Update the form below to change these details.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Account</span>
              <span className="text-gray-900 font-medium font-mono">**** {bankAccount.account_number_last4}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">IFSC</span>
              <span className="text-gray-900 font-medium font-mono">{bankAccount.ifsc_code}</span>
            </div>
            {bankAccount.pan_last4 && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">PAN</span>
                <span className="text-gray-900 font-medium font-mono">****{bankAccount.pan_last4}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Bank account</h3>
          <Field
            id="account_name"
            label="Account holder name"
            value={form.account_name}
            onChange={(e) => setField('account_name', e.target.value)}
            placeholder="Name as per bank records"
            error={errors.account_name}
          />
          <Field
            id="account_number"
            label="Account number"
            value={form.account_number}
            onChange={(e) => setField('account_number', e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Enter full account number"
            inputMode="numeric"
            error={errors.account_number}
          />
          <Field
            id="confirm_account_number"
            label="Confirm account number"
            value={form.confirm_account_number}
            onChange={(e) => setField('confirm_account_number', e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Re-enter account number"
            inputMode="numeric"
            error={errors.confirm_account_number}
          />
          <Field
            id="ifsc_code"
            label="IFSC code"
            value={form.ifsc_code}
            onChange={(e) => setField('ifsc_code', e.target.value.toUpperCase())}
            placeholder="e.g. HDFC0001234"
            error={errors.ifsc_code}
          />
          <Field
            id="confirm_ifsc_code"
            label="Confirm IFSC code"
            value={form.confirm_ifsc_code}
            onChange={(e) => setField('confirm_ifsc_code', e.target.value.toUpperCase())}
            placeholder="Re-enter IFSC code"
            error={errors.confirm_ifsc_code}
          />

          <h3 className="pt-2 text-sm font-bold text-gray-900 uppercase tracking-wider">KYC details</h3>
          <Field
            id="pan"
            label="PAN"
            value={form.pan}
            onChange={(e) => setField('pan', e.target.value.toUpperCase())}
            placeholder="e.g. ABCDE1234F"
            maxLength={10}
            error={errors.pan}
          />
          <Field
            id="business_name"
            label="Business / legal name"
            value={form.business_name}
            onChange={(e) => setField('business_name', e.target.value)}
            placeholder="Registered business name"
            error={errors.business_name}
          />
          <Field
            id="contact_phone"
            label="Contact phone"
            value={form.contact_phone}
            onChange={(e) => setField('contact_phone', e.target.value.replace(/[^0-9+]/g, ''))}
            placeholder="10-digit mobile number"
            inputMode="tel"
            error={errors.contact_phone}
          />
          <Field
            id="contact_email"
            label="Contact email"
            value={form.contact_email}
            onChange={(e) => setField('contact_email', e.target.value)}
            placeholder="name@example.com"
            type="email"
            error={errors.contact_email}
          />
          <Field
            id="address_line"
            label="Address"
            value={form.address_line}
            onChange={(e) => setField('address_line', e.target.value)}
            placeholder="Registered business address"
            error={errors.address_line}
          />
          <Field
            id="pincode"
            label="Pincode"
            value={form.pincode}
            onChange={(e) => setField('pincode', e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="6-digit pincode"
            inputMode="numeric"
            maxLength={6}
            error={errors.pincode}
          />
          <Field
            id="gstin"
            label="GSTIN (optional)"
            value={form.gstin}
            onChange={(e) => setField('gstin', e.target.value.toUpperCase())}
            placeholder="15-character GSTIN"
            maxLength={15}
            error={errors.gstin}
          />

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-teal-700 text-white font-semibold py-4 disabled:opacity-60 transition-opacity hover:bg-teal-800"
          >
            {saveMutation.isPending
              ? 'Saving...'
              : bankAccount
              ? 'Update Payout Details'
              : 'Save Payout Details'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            🔒 Your bank and KYC details are encrypted and stored securely.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default BankAccountPage;
