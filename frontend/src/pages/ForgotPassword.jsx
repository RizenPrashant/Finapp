import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, Lock, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import api from '../api';

const STEP = { EMAIL: 1, OTP: 2, DONE: 3 };

export default function ForgotPassword() {
  const [step, setStep] = useState(STEP.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep(STEP.OTP);
    } catch (err) {
      setError(err.response?.data || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setStep(STEP.DONE);
    } catch (err) {
      setError(err.response?.data || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">

          {/* Step 1 — Enter Email */}
          {step === STEP.EMAIL && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl mb-4">
                  <Mail size={26} className="text-slate-600 dark:text-slate-300" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Forgot Password</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Enter your email and we'll send you an OTP</p>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>}
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      placeholder="Enter your registered email"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 outline-none dark:text-white" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Sending OTP...' : <> Send OTP <ArrowRight size={18} /> </>}
                </button>
              </form>
            </>
          )}

          {/* Step 2 — Enter OTP + New Password */}
          {step === STEP.OTP && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl mb-4">
                  <KeyRound size={26} className="text-slate-600 dark:text-slate-300" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Enter OTP</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">OTP sent to <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span></p>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>}
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">6-digit OTP</label>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6}
                    placeholder="Enter OTP from email"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-center tracking-widest font-bold focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 outline-none dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                      placeholder="New password (min 6 chars)"
                      className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 outline-none dark:text-white" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 outline-none dark:text-white" />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Resetting...' : <> Reset Password <ArrowRight size={18} /> </>}
                </button>
                <button type="button" onClick={() => { setStep(STEP.EMAIL); setError(''); }}
                  className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 flex items-center justify-center gap-1">
                  <ArrowLeft size={14} /> Change email
                </button>
              </form>
            </>
          )}

          {/* Step 3 — Done */}
          {step === STEP.DONE && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Password Reset!</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Your password has been updated successfully.</p>
              <Link to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-700 transition text-sm">
                Back to Login <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {step !== STEP.DONE && (
            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Remember your password?{' '}
              <Link to="/login" className="text-slate-900 dark:text-slate-300 font-semibold hover:underline">Sign In</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
