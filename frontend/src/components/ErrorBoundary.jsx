import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected UI error' };
  }

  componentDidCatch(error, info) {
    console.error('UI crash prevented by ErrorBoundary:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-[60vh] place-items-center p-4">
        <div className="card max-w-md p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-rose-50 text-rose-700">
            <AlertTriangle size={24} />
          </div>
          <h1 className="mt-4 text-xl font-bold">This screen could not load</h1>
          <p className="mt-2 text-sm text-stone-500">{this.state.message}</p>
          <button className="btn-primary mt-5" onClick={() => this.setState({ hasError: false, message: '' })}>
            <RefreshCw size={17} /> Try again
          </button>
        </div>
      </div>
    );
  }
}
