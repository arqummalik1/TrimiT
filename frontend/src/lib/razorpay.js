/** Lazily load the Razorpay Checkout script (once). Resolves window.Razorpay. */
let loadPromise = null;

export function loadRazorpay() {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Razorpay checkout'));
    };
    document.body.appendChild(script);
  });
  return loadPromise;
}
