
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LockKeyhole, UserPlus, LogIn, AlertTriangle } from 'lucide-react';

export function LoginModal() {
  const { login, register, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Clear form when modal opens (security: prevent pre-filled credentials)
  useEffect(() => {
    if (!isAuthenticated) {
      setUsername('');
      setPassword('');
      setError(null);
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await register(username, password);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 rounded-[16px] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card bg-base-300/50 inset-shadow-primary inset-shadow-xs rounded-lg w-[400px] ">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LockKeyhole className="w-6 h-6 text-primary" />
            </div>
            <h2 className="card-title text-xl">Amp Manager</h2>
          </div>
              <div className="alert alert-soft alert-warning text-xs">
                <AlertTriangle className="h-4 w-4" />
                <div>
                  <span className="font-bold">Warning:</span> There is no "Forgot Password". 
                  Your data is encrypted, if you lose it, your data is gone forever.
                </div>
              </div>

          <div role="tablist" className="tabs tabs tabs-border mb-4">
            <a 
              role="tab" 
              className={`tab ${activeTab === 'login' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </a>
            <a 
              role="tab" 
              className={`tab ${activeTab === 'register' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Register
            </a>
          </div>

          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Username</span>
                </label>
                <input 
                  type="text" 
                  placeholder="admin" 
                  className="input input-bordered w-full" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Password</span>
                </label>
                <input 
                  type="password" 
                  className="input input-bordered w-full" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="alert alert-outline alert-error text-sm py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Username</span>
                </label>
                <input 
                  type="text" 
                  placeholder="new-user" 
                  className="input input-bordered w-full" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Password</span>
                </label>
                <input 
                  type="password" 
                  className="input input-bordered w-full" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  autoComplete="off"
                />
              </div>
              {error && (
                <div className="alert alert-outline alert-error text-sm py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              <button type="submit" className="btn btn-secondary w-full" disabled={isLoading}>
                {isLoading ? 'Registering...' : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
