import React from 'react';

const Login: React.FC = () => {
    const handleGoogleLogin = () => {
        // Redirect to backend OAuth endpoint
        window.location.href = 'http://localhost:8000/auth/login';
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>Welcome to Rexie</h1>
                    <p style={styles.subtitle}>Your AI-powered assistant for Gmail, Calendar, and more</p>
                </div>

                <div style={styles.content}>
                    <button onClick={handleGoogleLogin} style={styles.googleButton}>
                        <svg style={styles.googleIcon} viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        <span style={styles.buttonText}>Sign in with Google</span>
                    </button>

                    <div style={styles.features}>
                        <div style={styles.feature}>
                            <span style={styles.featureIcon}>📧</span>
                            <span>Send emails with AI</span>
                        </div>
                        <div style={styles.feature}>
                            <span style={styles.featureIcon}>📅</span>
                            <span>Manage your calendar</span>
                        </div>
                        <div style={styles.feature}>
                            <span style={styles.featureIcon}>📝</span>
                            <span>Create documents</span>
                        </div>
                    </div>
                </div>

                <div style={styles.footer}>
                    <p style={styles.footerText}>
                        By signing in, you agree to our Terms of Service and Privacy Policy
                    </p>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '450px',
        width: '100%',
        overflow: 'hidden',
    },
    header: {
        padding: '40px 40px 20px',
        textAlign: 'center',
    },
    title: {
        fontSize: '32px',
        fontWeight: '700',
        color: '#1a202c',
        margin: '0 0 10px',
    },
    subtitle: {
        fontSize: '16px',
        color: '#718096',
        margin: 0,
    },
    content: {
        padding: '20px 40px 40px',
    },
    googleButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '14px 24px',
        backgroundColor: 'white',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#1a202c',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    googleIcon: {
        width: '24px',
        height: '24px',
    },
    buttonText: {
        fontSize: '16px',
    },
    features: {
        marginTop: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    feature: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        color: '#4a5568',
    },
    featureIcon: {
        fontSize: '20px',
    },
    footer: {
        padding: '20px 40px',
        backgroundColor: '#f7fafc',
        borderTop: '1px solid #e2e8f0',
    },
    footerText: {
        fontSize: '12px',
        color: '#a0aec0',
        textAlign: 'center',
        margin: 0,
    },
};

export default Login;
