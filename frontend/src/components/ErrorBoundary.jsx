import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-white">
                    <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
                    <div className="bg-black/50 p-4 rounded text-left overflow-auto max-h-96">
                        <p className="text-red-400 font-mono text-sm break-all">
                            {this.state.error && this.state.error.toString()}
                        </p>
                        <pre className="text-xs text-gray-500 mt-2 whitespace-pre-wrap font-mono">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
