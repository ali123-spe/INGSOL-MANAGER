import React, { useState } from 'react';
import { supabase } from '../services/supabase';

export default function Auth({ onSession }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('sign_in'); // 'sign_in', 'sign_up', 'forgot_password'
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (view === 'sign_in') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.session) {
          onSession(data.session);
        }
      } else if (view === 'sign_up') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email for the confirmation link.' });
      } else if (view === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password reset instructions sent to your email.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--desk-surface)',
      fontFamily: 'var(--font-sans)',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--paper-card)',
        padding: '40px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-paper-layer)',
        width: '100%',
        maxWidth: '420px',
        color: 'var(--paper-text-main)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: 'var(--ingsol-dark-navy)' }}>
            INGSOL Manager
          </h1>
          <p style={{ color: 'var(--paper-text-muted)', fontSize: '14px' }}>
            {view === 'sign_in' ? 'Sign in to continue to your workspace' : 
             view === 'sign_up' ? 'Create a new account' : 
             'Reset your password'}
          </p>
        </div>

        {message.text && (
          <div style={{
            padding: '12px',
            marginBottom: '20px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: message.type === 'error' ? '#991b1b' : '#166534',
            fontSize: '14px',
            border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--paper-border)',
                backgroundColor: 'var(--paper-card-warm)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--ingsol-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--paper-border)'}
            />
          </div>

          {view !== 'forgot_password' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--paper-border)',
                  backgroundColor: 'var(--paper-card-warm)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--ingsol-primary)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--paper-border)'}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--ingsol-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '600',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.backgroundColor = 'var(--ingsol-secondary)')}
            onMouseOut={(e) => !loading && (e.target.style.backgroundColor = 'var(--ingsol-primary)')}
          >
            {loading ? 'Processing...' : 
             view === 'sign_in' ? 'Sign In' : 
             view === 'sign_up' ? 'Create Account' : 
             'Send Reset Link'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--paper-text-muted)' }}>
          {view === 'sign_in' ? (
            <>
              Don't have an account?{' '}
              <button 
                onClick={() => setView('sign_up')} 
                style={{ background: 'none', border: 'none', color: 'var(--ingsol-secondary)', fontWeight: '600', cursor: 'pointer', padding: 0 }}
              >
                Sign Up
              </button>
              <br /><br />
              <button 
                onClick={() => setView('forgot_password')} 
                style={{ background: 'none', border: 'none', color: 'var(--paper-text-muted)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Forgot your password?
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                onClick={() => setView('sign_in')} 
                style={{ background: 'none', border: 'none', color: 'var(--ingsol-secondary)', fontWeight: '600', cursor: 'pointer', padding: 0 }}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
