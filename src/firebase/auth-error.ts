'use client';

import type { AuthError } from 'firebase/auth';

export function getAuthErrorMessage(error: AuthError, mode: 'login' | 'register'): string {
  const code = error.code || '';

  if (code === 'auth/email-already-in-use') {
    return 'This email is already in use. Please try logging in instead.';
  }

  if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
    return 'Invalid email or password. Please try again.';
  }

  if (code.includes('identity-toolkit-api-has-not-been-used-in-project') || code.includes('api-key-service-blocked')) {
    return 'Firebase Authentication API is disabled for this project. Enable Identity Toolkit API in Google Cloud Console, then retry.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is disabled. Enable it in Firebase Console > Authentication > Sign-in method.';
  }

  if (code === 'auth/invalid-api-key') {
    return 'Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY in .env.local.';
  }

  if (mode === 'register' && code === 'auth/weak-password') {
    return 'Password is too weak. Use at least 6 characters.';
  }

  return error.message || `Authentication failed (${code || 'unknown'}).`;
}
