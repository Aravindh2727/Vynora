import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithPopup, getAdditionalUserInfo, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

import { useContextEngineStore } from '../store/useContextEngineStore';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" })
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useContextEngineStore();
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [unverifiedUser, setUnverifiedUser] = React.useState<any>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setAuthError(null);
      setUnverifiedUser(null);
      
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setUnverifiedUser(user);
        setAuthError("Please verify your email address before signing in. Check your inbox or spam folder for the verification link.");
        return;
      }

      setUser({ id: user.uid, name: user.displayName || 'User', email: user.email || '' });
      navigate('/');
    } catch (error: any) {
      console.error("Login Error:", error);
      setAuthError("Invalid email or password.");
    }
  };

  const handleResend = async () => {
    if (unverifiedUser) {
      try {
        await sendEmailVerification(unverifiedUser);
        alert("Verification link resent! Please check your inbox.");
      } catch (e: any) {
        alert("Error resending link. Please try again later.");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const additionalInfo = getAdditionalUserInfo(result);
      
      if (additionalInfo?.isNewUser) {
        // The user tried to sign in, but they don't have an account yet.
        await result.user.delete();
        await auth.signOut();
        setAuthError("Account not found! Please create an account on the Sign Up page first.");
        return;
      }

      const user = result.user;
      setUser({ id: user.uid, name: user.displayName || 'Google User', email: user.email || '' });
      navigate('/');
    } catch (error: any) {
      console.error("Google Sign-In Error:", error.message);
      setAuthError("Failed to sign in with Google: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden text-textMain font-sans">
      {/* Background glowing orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent/20 rounded-full blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full shadow-neon-primary mb-4 overflow-hidden flex items-center justify-center border border-primary/20">
            <img src="/vynora_logo.png" alt="Vynora Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold tracking-wider mb-2">Vynora</h1>
          <p className="text-textMuted text-center text-sm">One Platform. Every Part of Life.</p>
        </div>

        {authError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl mb-6 text-center">
            <p>{authError}</p>
            {unverifiedUser && (
              <button 
                type="button"
                onClick={handleResend} 
                className="mt-3 bg-surface border border-red-500/50 text-red-400 hover:text-red-300 hover:bg-surfaceLight px-4 py-2 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider"
              >
                Resend Verification Link
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm text-textMuted mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                {...register('email')}
                className="w-full bg-surface border border-glass rounded-xl py-3 pl-10 pr-4 text-textMain outline-none focus:border-primary transition-colors"
                placeholder="name@example.com"
              />
            </div>
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm text-textMuted">Password</label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                {...register('password')}
                className="w-full bg-surface border border-glass rounded-xl py-3 pl-10 pr-4 text-textMain outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-primary text-background font-semibold py-3 rounded-xl hover:bg-primary/90 transition-all shadow-neon-primary flex items-center justify-center gap-2"
          >
            {isSubmitting ? <span className="animate-spin border-2 border-background border-t-transparent rounded-full w-5 h-5"></span> : <><LogIn size={18} /> Sign In</>}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-textMuted">
          <span className="w-1/3 border-b border-glass"></span>
          <span>OR</span>
          <span className="w-1/3 border-b border-glass"></span>
        </div>

        <button onClick={handleGoogleSignIn} type="button" className="w-full mt-6 bg-surface border border-glass py-3 rounded-xl hover:bg-surfaceLight transition-colors flex items-center justify-center gap-3">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>

        <p className="mt-8 text-center text-sm text-textMuted">
          Don't have an account? <Link to="/register" className="text-primary hover:underline">Create one</Link>
        </p>
      </motion.div>
    </div>
  );
}
