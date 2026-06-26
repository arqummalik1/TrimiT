import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Wallet, ArrowsClockwise, ArrowRight } from '@phosphor-icons/react';

const ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Secure payments',
    text: 'Pay with UPI, cards, net banking, or wallets — processed by trusted, PCI-DSS compliant partners.',
  },
  {
    icon: Wallet,
    title: 'Pay your way',
    text: 'Pay online while booking, or simply pay at the salon. Your choice, every time.',
  },
  {
    icon: ArrowsClockwise,
    title: 'Easy refunds',
    text: 'Cancelled an eligible booking? Refunds go back to your original method, usually in 5–7 days.',
  },
];

export default function PaymentTrustSection() {
  return (
    <section
      className="py-20 sm:py-24 px-4 bg-stone-50"
      aria-labelledby="payment-trust-heading"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-orange-800">
            Payments
          </span>
          <h2
            id="payment-trust-heading"
            className="font-heading text-3xl sm:text-4xl font-bold text-stone-900 mt-3"
          >
            Booking and paying, made safe and simple
          </h2>
          <p className="text-stone-600 mt-3 max-w-2xl mx-auto">
            No hidden charges. Pay how you like, and get help fast if anything goes wrong.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6">
          {ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              className="rounded-2xl border border-stone-200 bg-white p-6 text-center"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-800 mb-4">
                <item.icon size={26} weight="duotone" />
              </span>
              <h3 className="font-heading font-bold text-stone-900 mb-2">{item.title}</h3>
              <p className="text-stone-600 text-sm leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/help/payments"
            className="inline-flex items-center gap-1.5 text-orange-800 font-semibold hover:underline"
          >
            How payments work
            <ArrowRight size={18} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
