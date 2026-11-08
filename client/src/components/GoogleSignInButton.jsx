import { GoogleLogin } from '@react-oauth/google';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../lib/authApi.js';

const CLIENT_ID_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

// onSuccess(user) is called after the backend has actually verified the
// token and returned a session — not on Google's popup closing, which only
// means the user picked an account, not that we've signed them in yet.
export default function GoogleSignInButton({ onSuccess }) {
  const mutation = useMutation({
    mutationFn: (credential) => signInWithGoogle(credential),
    onSuccess,
  });

  // No Client ID configured (see client/.env.example) — hide rather than
  // render a button that can only ever fail, same graceful-degradation
  // choice the backend makes when GOOGLE_CLIENT_ID is unset.
  if (!CLIENT_ID_CONFIGURED) return null;

  return (
    <div>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (!credentialResponse.credential) return;
            mutation.mutate(credentialResponse.credential);
          }}
          onError={() => mutation.reset()}
          theme="outline"
          shape="rectangular"
          width="320"
        />
      </div>

      {mutation.isPending && (
        <p className="mt-3 text-center text-[15px] text-text-muted">Signing you in…</p>
      )}

      {mutation.isError && (
        <div role="alert" className="mt-3 flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3 text-[15px] text-error">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          {mutation.error.message}
        </div>
      )}
    </div>
  );
}
