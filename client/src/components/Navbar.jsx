import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, Menu, X, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useLogout } from '../lib/useLogout.js';
import { ROLE_ADMIN, ROLE_EMPLOYEE } from '../lib/roles.js';
import Button from './Button.jsx';
import HpclMark from './HpclMark.jsx';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/about-operations', label: 'Operations' },
  { to: '/contact', label: 'Contact' },
];

function NavItem({ to, label, onClick, className = '' }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `relative px-2.5 py-2 text-[15px] font-medium whitespace-nowrap transition-colors ${
          isActive ? 'text-text' : 'text-text-secondary hover:text-text'
        } ${className}`
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {isActive && <span className="absolute inset-x-2.5 -bottom-[1px] h-[2px] bg-brand" />}
        </>
      )}
    </NavLink>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const handleLogout = useLogout();
  const { isAuthenticated, user } = useAuthStore();
  const isStaff = user?.role === ROLE_ADMIN || user?.role === ROLE_EMPLOYEE;
  const accountHref = isStaff ? '/admin' : '/portal';
  const accountLabel = isStaff ? 'Staff CRM' : 'My Orders';

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-lock + Escape-to-close for the mobile menu — real a11y behavior,
  // not just a CSS slide-in.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="hidden bg-dark font-mono text-[15px] text-text-invert-muted sm:block">
        <div className="flex items-center justify-end gap-5 px-7 py-1.5">
          <a href="tel:+919735496000" className="inline-flex items-center gap-1.5 hover:text-text-invert">
            <Phone size={12} /> +91 97354 96000
          </a>
          <a href="mailto:hpclcfa2000@gmail.com" className="inline-flex items-center gap-1.5 hover:text-text-invert">
            <Mail size={12} /> hpclcfa2000@gmail.com
          </a>
        </div>
      </div>

      <header className={`sticky top-0 z-50 bg-surface transition-shadow ${scrolled ? 'border-b border-hairline shadow-elevated' : 'border-b border-transparent'}`}>
        <nav aria-label="Primary" className="flex h-[80px] items-center justify-between px-7">
          <div className="flex min-w-0 items-center">
            <NavLink to="/" className="flex min-w-0 items-center gap-3" aria-label="M/s Jay Prakash Ganeriwala — Home">
              {/* HPCL association mark leads now — square emblem while the
                  nav row is collapsed into the hamburger (md through lg,
                  plenty of spare width either way); once the full nav row
                  is showing (xl+, where every label + the CTA is already
                  budgeted in), swap to the wider horizontal lockup since
                  there's confirmed slack left in the container at that
                  width — the header is full-bleed now (no max-w-container),
                  so there's more real room at xl+ than there used to be. */}
              <div className="hidden flex-shrink-0 items-center md:flex xl:hidden">
                <HpclMark variant="emblem" className="h-12 w-12" alt="Hindustan Petroleum Corporation Limited" />
              </div>
              <div className="hidden flex-shrink-0 items-center xl:flex">
                <HpclMark variant="horizontal" className="h-11" alt="Hindustan Petroleum Corporation Limited" />
              </div>

              <div className="flex min-w-0 items-center gap-3 md:border-l md:border-hairline md:pl-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border-2 border-brand bg-brand font-mono text-[13px] font-bold tracking-tight text-white">
                  JPG
                </div>

                <div className="min-w-0">
                  <div className="truncate text-[17.5px] font-bold leading-tight text-text">M/s Jay Prakash Ganeriwala</div>
                  <div className="mt-0.5 truncate font-mono text-[12.5px] uppercase tracking-[0.1em] text-text-muted">
                    C&amp;F Agent · HPCL Industrial Lubricants
                  </div>
                </div>
              </div>
            </NavLink>
          </div>

          {/* Nav links live in the same right-side cluster as Login/Enquiry
              — one uniform gap across the whole group, not a separate
              mid-row cluster with its own gap flanked by two different
              gap sizes either side of it. */}
          <div className="hidden items-center gap-6 xl:flex">
            {NAV_LINKS.map((l) => (
              <NavItem key={l.to} {...l} />
            ))}
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <NavItem to={accountHref} label={accountLabel} />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-sm px-2.5 py-2 text-[15px] font-medium text-text-secondary hover:text-text"
                  aria-label="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <NavItem to="/login" label="Login" />
            )}
            <div className="flex items-center border-l border-hairline pl-6">
              <Button to="/contact?type=dealer" variant="primary" className="!px-5 !py-2.5 !text-[15px]">
                Enquiry
              </Button>
            </div>
          </div>

          <button
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-sm text-text xl:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[55] bg-dark/60 xl:hidden"
              aria-hidden="true"
            />
            <motion.div
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.22, ease: [0.22, 0.9, 0.3, 1] }}
              className="fixed right-0 top-0 z-[60] flex h-[100dvh] w-[86%] max-w-[360px] flex-col overflow-y-auto bg-surface px-7 pb-8 pt-8 shadow-elevated xl:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-mono text-[12.5px] uppercase tracking-[0.14em] text-text-muted">Menu</span>
                <button aria-label="Close menu" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center text-text">
                  <X size={22} />
                </button>
              </div>

              <div className="mb-2 flex flex-col gap-2.5 border-b border-hairline pb-5 font-mono text-[15px] text-text-secondary">
                <a href="tel:+919735496000" className="inline-flex items-center gap-2 hover:text-text">
                  <Phone size={14} /> +91 97354 96000
                </a>
                <a href="mailto:hpclcfa2000@gmail.com" className="inline-flex items-center gap-2 hover:text-text">
                  <Mail size={14} /> hpclcfa2000@gmail.com
                </a>
              </div>

              <div className="flex flex-1 flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <NavItem key={l.to} {...l} onClick={() => setOpen(false)} className="!px-2 !py-3.5 text-[17.5px]" />
                ))}
                {isAuthenticated ? (
                  <>
                    <NavItem to={accountHref} label={accountLabel} onClick={() => setOpen(false)} className="!px-2 !py-3.5 text-[17.5px]" />
                    <button
                      onClick={() => {
                        handleLogout();
                        setOpen(false);
                      }}
                      className="flex items-center gap-2 px-2 py-3.5 text-left text-[17.5px] font-medium text-text-secondary"
                    >
                      <LogOut size={17} /> Sign Out
                    </button>
                  </>
                ) : (
                  <NavItem to="/login" label="Login" onClick={() => setOpen(false)} className="!px-2 !py-3.5 text-[17.5px]" />
                )}
              </div>

              <Button to="/contact?type=dealer" variant="primary" onClick={() => setOpen(false)} className="w-full !py-3.5">
                Enquiry
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
