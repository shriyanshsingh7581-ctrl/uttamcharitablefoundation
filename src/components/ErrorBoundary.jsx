import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-red-200 p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900">
                तकनीकी समस्या (Application Notice)
              </h1>
              <p className="text-xs text-slate-600">
                वेबसाइट को लोड करने के दौरान एक त्रुटि उत्पन्न हुई।
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-900 text-red-300 rounded-xl text-left text-xs font-mono overflow-x-auto max-h-40">
                <p className="font-bold text-white mb-1">त्रुटि विवरण:</p>
                <p>{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-slate-400 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>पृष्ठ पुनः लोड करें (Reload)</span>
              </button>
              
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <Home className="w-4 h-4" />
                <span>मुख्य पृष्ठ (Home)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
