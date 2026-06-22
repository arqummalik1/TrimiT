import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Bank, CheckCircle } from '@phosphor-icons/react';
import { useBankAccount, useCreateLinkedAccount } from '../../hooks/useBankAccount';
import { useQueryClient } from '@tanstack/react-query';

const BankAccountPage = () => {
  const queryClient = useQueryClient();
  const { data: bankAccount, isLoading } = useBankAccount();
  const createMutation = useCreateLinkedAccount();

  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [confirmIfsc, setConfirmIfsc] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!accountNumber || !confirmAccountNumber || !ifsc || !confirmIfsc || !beneficiaryName) {
      setError('Please fill all the required fields');
      return;
    }

    if (accountNumber !== confirmAccountNumber) {
      setError('Account numbers do not match');
      return;
    }

    if (ifsc !== confirmIfsc) {
      setError('IFSC codes do not match');
      return;
    }

    createMutation.mutate(
      {
        account_number: accountNumber,
        ifsc_code: ifsc,
        beneficiary_name: beneficiaryName,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['bankAccount'] });
        },
        onError: (err) => {
          setError(err?.response?.data?.detail?.message || err?.response?.data?.detail || 'Failed to link bank account.');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="animate-pulse h-40 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <Link to="/owner/settings" className="inline-flex items-center gap-2 text-gray-600 mb-6 hover:text-gray-900 transition-colors">
        <ArrowLeft size={20} /> Back to settings
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bank Account Details</h1>
        <p className="text-gray-600">
          Link your bank account to receive payments directly from customers.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {bankAccount ? (
        <div className="rounded-2xl border border-teal-300 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
              <Bank size={24} weight="fill" className="text-teal-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-gray-900">Linked Account</h2>
                <CheckCircle size={20} weight="fill" className="text-teal-600" />
              </div>
              <p className="text-sm text-gray-500">Your bank account is successfully linked and active.</p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-gray-50 p-4 border border-gray-100">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Account Number</span>
              <span className="text-gray-900 font-medium font-mono">
                {bankAccount.account_number_last4 ? `**** ${bankAccount.account_number_last4}` : 'Active Account'}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                Active
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="beneficiaryName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Beneficiary Name
              </label>
              <input
                id="beneficiaryName"
                type="text"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="Name as per bank records"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-shadow"
                required
              />
            </div>

            <div>
              <label htmlFor="accountNumber" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Account Number
              </label>
              <input
                id="accountNumber"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Bank account number"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-shadow font-mono"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmAccountNumber" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirm Account Number
              </label>
              <input
                id="confirmAccountNumber"
                type="text"
                value={confirmAccountNumber}
                onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Confirm bank account number"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-shadow font-mono"
                required
              />
            </div>

            <div>
              <label htmlFor="ifsc" className="block text-sm font-semibold text-gray-700 mb-1.5">
                IFSC Code
              </label>
              <input
                id="ifsc"
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-shadow font-mono"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmIfsc" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirm IFSC Code
              </label>
              <input
                id="confirmIfsc"
                type="text"
                value={confirmIfsc}
                onChange={(e) => setConfirmIfsc(e.target.value.toUpperCase())}
                placeholder="Confirm IFSC code"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-shadow font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-teal-700 text-white font-semibold py-4 disabled:opacity-60 transition-opacity hover:bg-teal-800"
            >
              {createMutation.isPending ? 'Linking Account...' : 'Link Bank Account'}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1.5">
              <span className="inline-block w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">🔒</span>
              Your details are stored securely.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BankAccountPage;
