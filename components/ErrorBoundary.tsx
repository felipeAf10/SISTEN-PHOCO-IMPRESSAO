import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 bg-red-50 h-full flex flex-col items-center justify-center text-center">
                    <h2 className="text-2xl font-bold text-red-800 mb-4">Algo deu errado neste componente.</h2>
                    <p className="text-red-600 mb-4 bg-white p-4 rounded-lg shadow-sm border border-red-200 font-mono text-sm max-w-2xl overflow-auto">
                        {this.state.error && this.state.error.toString()}
                    </p>
                    <button
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        onClick={() => this.setState({ hasError: false, error: null })}
                    >
                        Tentar Novamente
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
