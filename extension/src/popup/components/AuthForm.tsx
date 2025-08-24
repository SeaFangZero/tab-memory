// Authentication form component
import React, { useState } from 'react';

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      await onLogin(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="email" className="form-label">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
          placeholder="Enter your email"
          disabled={isLoading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
          placeholder="Enter your password"
          disabled={isLoading}
          required
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isLoading || !email || !password}
      >
        {isLoading ? (
          <>
            <span className="loading-spinner" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>

      <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '12px' }}>
        Don't have an account?{' '}
        <a 
          href="https://tabmemory.com/signup" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#3b82f6', textDecoration: 'none' }}
        >
          Sign up here
        </a>
      </div>
    </form>
  );
};
