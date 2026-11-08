import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import PageWrapper from '../../components/PageWrapper.jsx';
import Button from '../../components/Button.jsx';
import { useProfile, useUpdateProfile } from '../../lib/useProfile.js';

const ROLE_LABELS = { client: 'Client', employee: 'Employee', admin: 'Admin' };

export default function EditProfile() {
  const { data: profile, isLoading, isError } = useProfile();

  return (
    <PageWrapper>
      <section className="flex min-h-[70vh] items-center justify-center bg-bg py-16">
        <div className="w-full max-w-[440px] px-7">
          <Link to="/portal" className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-text-muted hover:text-text">
            <ArrowLeft size={14} /> Back to Portal
          </Link>

          <div className="border-2 border-hairline bg-surface p-8">
            <div className="font-mono text-[12.5px] font-medium uppercase tracking-[0.14em] text-accent">Account</div>
            <h1 className="mt-2.5 text-[22px] font-bold text-text">Edit Profile</h1>
            <p className="mt-2 text-[17.5px] text-text-secondary">Update your name and contact details.</p>

            {isLoading && <div className="py-10 text-center text-[17.5px] text-text-muted">Loading your profile…</div>}

            {isError && (
              <div role="alert" className="mt-6 flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3 text-[17.5px] text-error">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> Could not load your profile. Try refreshing.
              </div>
            )}

            {/* key={profile.id} makes this mount fresh (with correct
                initial form state) whenever a *different* profile record
                loads, instead of syncing profile -> form via an effect. */}
            {!isLoading && !isError && profile && <ProfileForm key={profile.id} profile={profile} />}
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}

function ProfileForm({ profile }) {
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState({
    name: profile.name ?? '',
    contactPerson: profile.contactPerson ?? '',
    companyName: profile.companyName ?? '',
    phone: profile.phone ?? '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    updateProfile.mutate(form);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {/* Read-only — email is the account identifier (and how OTP/Google
          sign-in find this account); role is set by staff, not by the
          account holder. Shown, not editable. */}
      <div>
        <span className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">Email</span>
        <div className="field-input cursor-not-allowed bg-bg text-text-muted">{profile.email}</div>
      </div>
      <div>
        <span className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">Role</span>
        <div className="field-input cursor-not-allowed bg-bg text-text-muted">
          {ROLE_LABELS[profile.role] ?? profile.role}
        </div>
      </div>

      <div className="border-t border-hairline pt-4">
        <label htmlFor="profile-name" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
          Your Name
        </label>
        <input
          id="profile-name"
          name="name"
          type="text"
          required
          value={form.name}
          onChange={handleChange}
          className="field-input"
          placeholder="Full name"
        />
      </div>
      <div>
        <label htmlFor="profile-contact" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
          Contact Person
        </label>
        <input
          id="profile-contact"
          name="contactPerson"
          type="text"
          value={form.contactPerson}
          onChange={handleChange}
          className="field-input"
          placeholder="Who to actually call at your company"
        />
      </div>
      <div>
        <label htmlFor="profile-phone" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
          Phone Number
        </label>
        <input
          id="profile-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={handleChange}
          className="field-input"
          placeholder="e.g. +91 98765 43210"
        />
      </div>
      <div>
        <label htmlFor="profile-company" className="mb-1.5 block text-[18.5px] font-semibold text-text-secondary">
          Company
        </label>
        <input
          id="profile-company"
          name="companyName"
          type="text"
          value={form.companyName}
          onChange={handleChange}
          className="field-input"
          placeholder="e.g. Andal Steel Works"
        />
      </div>

      {updateProfile.isError && (
        <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3 text-[17.5px] text-error">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {updateProfile.error.message}
        </div>
      )}
      {updateProfile.isSuccess && (
        <div role="status" className="flex items-start gap-2 border border-success/30 bg-success/5 px-4 py-3 text-[17.5px] text-success">
          <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" /> Saved.
        </div>
      )}

      <Button type="submit" disabled={updateProfile.isPending} className="w-full disabled:opacity-60">
        {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
      </Button>
    </form>
  );
}
