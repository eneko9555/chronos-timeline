import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export const LoginPage = () => {
    const { currentUser, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            navigate('/dashboard');
        }
    }, [currentUser, navigate]);

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#0f172a',
            color: 'white'
        }}>
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                <img
                    src="/favicon.png?v=10"
                    alt="Chronos Icon"
                    style={{ width: '80px', height: '80px', marginBottom: '1.5rem', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.1)' }}
                />
                <h1 style={{
                    fontSize: '3rem',
                    marginBottom: '2rem',
                    background: 'linear-gradient(to right, #fff, #94a3b8)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Chronos Timeline
                </h1>
                <p style={{ marginBottom: '2rem', color: '#94a3b8' }}>
                    Organiza tu historia. Visualiza tu tiempo.
                </p>

                <button
                    onClick={loginWithGoogle}
                    className="btn-primary"
                    style={{
                        fontSize: '1.2rem',
                        padding: '1rem 2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        margin: '0 auto'
                    }}
                >
                    <LogIn size={24} /> Iniciar Sesión con Google
                </button>
            </div>
        </div>
    );
};
