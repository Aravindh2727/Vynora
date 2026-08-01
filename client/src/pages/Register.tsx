import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, UserPlus, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useContextEngineStore } from '../store/useContextEngineStore';

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useContextEngineStore();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterFormValues) => {
    console.log("Simulating registration for:", data.email);
    setTimeout(() => {
      setUser({ id: '2', name: data.name, email: data.email });
      navigate('/');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden text-textMain font-sans">
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
          <h1 className="text-3xl font-bold tracking-wider mb-2">Join Vynora</h1>
          <p className="text-textMuted text-center text-sm">One Platform. Every Part of Life.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-textMuted mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                {...register('name')}
                className="w-full bg-surface border border-glass rounded-xl py-3 pl-10 pr-4 text-textMain outline-none focus:border-primary transition-colors"
                placeholder="John Doe"
              />
            </div>
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

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
            <label className="block text-sm text-textMuted mb-1">Password</label>
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

          <div>
            <label className="block text-sm text-textMuted mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                {...register('confirmPassword')}
                className="w-full bg-surface border border-glass rounded-xl py-3 pl-10 pr-4 text-textMain outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>
            {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full mt-2 bg-primary text-background font-semibold py-3 rounded-xl hover:bg-primary/90 transition-all shadow-neon-primary flex items-center justify-center gap-2"
          >
            {isSubmitting ? <span className="animate-spin border-2 border-background border-t-transparent rounded-full w-5 h-5"></span> : <><UserPlus size={18} /> Create Account</>}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-textMuted">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
