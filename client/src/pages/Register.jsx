import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import PageWrapper from '../components/PageWrapper.jsx';
import Button from '../components/Button.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import { register } from '../lib/authApi.js';

const EMPTY = { name: '', email: '', password: '', companyName: '', phone: '' };

const FIELDS = [
  { id: 'reg-name', name: 'name', label: 'Your Name', type: 'text', required: true, placeholder: 'Full name' },
  { id: 'reg-company', name: 'companyName', label: 'Company', type: 'text', placeholder: 'e.g. Andal Steel Works' },
  { id: 'reg-email', name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@company.com' },
  // Optional — so we can call about orders. Validated server-side.
  { id: 'reg-phone', name: 'phone', label: 'Phone Number (optional)', type: 'tel', placeholder: 'e.g. +91 98765 43210' },
  { id: 'reg-password', name: 'password', label: 'Password', type: 'password', required: true, minLength: 8, placeholder: 'Min. 8 characters' },
];

export default function Register() {
  const [form, setForm] = useState(EMPTY);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => register(form),
    onSuccess: () => navigate('/portal', { replace: true }),
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <PageWrapper>
      <section className="flex min-h-[70vh] items-center justify-center bg-bg py-16">
        <div className="w-full max-w-[420px] px-7">
          <div className="border-2 border-hairline bg-surface p-8">
            <div className="font-mono text-[12.5px] font-medium uppercase tracking-[0.14em] text-accent">Portal</div>
            <h1 className="mt-2.5 text-[22px] font-bold text-text">Create Account</h1>
            <p className="mt-2 text-[17.5px] text-text-secondary">
              Register your company to place orders and track deliveries online.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {FIELDS.map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
                    {f.label}
                  </label>
                  <input
                    id={f.id}
                    name={f.name}
                    type={f.type}
                    required={f.required}
                    minLength={f.minLength}
                    value={form[f.name]}
                    onChange={handleChange}
                    className="field-input"
                    placeholder={f.placeholder}
                  />
                </div>
              ))}

              {mutation.isError && (
                <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3 text-[17.5px] text-error">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  {mutation.error.message}
                </div>
              )}

              <Button type="submit" disabled={mutation.isPending} className="w-full disabled:opacity-60">
                {mutation.isPending ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[13px] font-medium uppercase tracking-wider text-text-muted">
              <span className="h-px flex-1 bg-hairline" />
              Or
              <span className="h-px flex-1 bg-hairline" />
            </div>

            {/* Same endpoint as Login's Google button — a new email creates
                an account here exactly like the form above, no separate
                signup path (see GoogleAuthHandler.SignIn on the backend). */}
            <GoogleSignInButton onSuccess={() => navigate('/portal', { replace: true })} />

            <div className="mt-5 text-center text-[17.5px] text-text-secondary">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-brand hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
