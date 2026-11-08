import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import PageWrapper from '../components/PageWrapper.jsx';
import Button from '../components/Button.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import { login } from '../lib/authApi.js';
import { ROLE_ADMIN, ROLE_EMPLOYEE } from '../lib/roles.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Shared by both sign-in paths — wherever the user ends up (staff CRM vs.
  // client portal, or back to whatever page sent them here) shouldn't
  // depend on which one they used.
  function goToAccount(user) {
    const isStaff = user.role === ROLE_ADMIN || user.role === ROLE_EMPLOYEE;
    const from = location.state?.from?.pathname;
    navigate(from || (isStaff ? '/admin' : '/portal'), { replace: true });
  }

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: goToAccount,
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <PageWrapper>
      <section className="flex min-h-[70vh] items-center justify-center bg-bg py-16">
        <div className="w-full max-w-[400px] px-7">
          <div className="border-2 border-hairline bg-surface p-8">
            <div className="font-mono text-[12.5px] font-medium uppercase tracking-[0.14em] text-accent">Portal</div>
            <h1 className="mt-2.5 text-[22px] font-bold text-text">Sign In</h1>
            <p className="mt-2 text-[17.5px] text-text-secondary">Access your order history and account.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input"
                  placeholder="••••••••"
                />
              </div>

              {mutation.isError && (
                <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3 text-[17.5px] text-error">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  {mutation.error.message}
                </div>
              )}

              <Button type="submit" disabled={mutation.isPending} className="w-full disabled:opacity-60">
                {mutation.isPending ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[13px] font-medium uppercase tracking-wider text-text-muted">
              <span className="h-px flex-1 bg-hairline" />
              Or
              <span className="h-px flex-1 bg-hairline" />
            </div>

            <GoogleSignInButton onSuccess={goToAccount} />

            <div className="mt-5 text-center text-[17.5px] text-text-secondary">
              No account yet?{' '}
              <Link to="/register" className="font-semibold text-brand hover:underline">
                Register for portal access
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
