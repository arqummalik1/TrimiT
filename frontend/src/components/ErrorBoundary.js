import React from 'react';
import { Warning, ArrowClockwise } from '@phosphor-icons/react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Warning size={32} weight="duotone" className="text-orange-800" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-stone-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-stone-500 mb-6">
              An unexpected error occurred. Please try reloading the page.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-orange-800 hover:bg-orange-900 text-white font-medium px-6 py-3 rounded-full transition-colors flex items-center justify-center gap-2"
              >
                <ArrowClockwise size={18} weight="bold" />
                Reload page
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-900 font-medium px-6 py-3 rounded-full transition-colors"
              >
                Go to home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
