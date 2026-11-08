import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Products from './pages/Products.jsx';
import ProductCategory from './pages/ProductCategory.jsx';
import AboutOperations from './pages/AboutOperations.jsx';
import Contact from './pages/Contact.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import { ROLE_ADMIN, ROLE_CLIENT, ROLE_EMPLOYEE } from './lib/roles.js';
import { useAuthStore } from './store/authStore.js';
import { api } from './lib/api.js';

// The client portal and staff CRM are behind a login and only ever visited
// by authenticated users — there's no reason a first-time public visitor's
// bundle should include them. Splitting these out is most of the app's
// unused-by-default weight (order management, product/employee CRUD,
// lead tables) kept out of the marketing-site download entirely.
const AdminLayout = lazy(() => import('./components/AdminLayout.jsx'));
const PortalDashboard = lazy(() => import('./pages/portal/PortalDashboard.jsx'));
const EditProfile = lazy(() => import('./pages/portal/EditProfile.jsx'));
const ManageAddresses = lazy(() => import('./pages/portal/ManageAddresses.jsx'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'));
const AdminClients = lazy(() => import('./pages/admin/AdminClients.jsx'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory.jsx'));
const AdminLeads = lazy(() => import('./pages/admin/AdminLeads.jsx'));
const AdminEmployees = lazy(() => import('./pages/admin/AdminEmployees.jsx'));

const ADMIN_MESSAGES = [
  'Establishing secure connection…',
  'Authenticating session…',
  'Loading staff CRM…',
];
const PORTAL_MESSAGES = [
  'Establishing secure connection…',
  'Authenticating session…',
  'Syncing your orders…',
];

function RouteFallback({ messages }) {
  return (
    <div className="relative min-h-[60vh]">
      <SplashScreen fullScreen={false} messages={messages} />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isBooting, setIsBooting] = useState(true);

  // The JWT lives in an httpOnly cookie now (see store/authStore.js) — this
  // app can't read it to know if a session is still valid, only ask the
  // server. Cached `user`/`isAuthenticated` renders instantly on load; this
  // reconciles it against reality right after. If the cookie's gone or
  // expired, GET fails with 401 and api.js's existing handler logs out —
  // nothing extra to do here beyond triggering the check.
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/auth/me').then((user) => {
      useAuthStore.getState().setSession(user);
    }).catch(() => {});
    // Only ever needs to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boot splash on first load of the app (not on client-side route changes
  // — App only mounts once per real page load, so this can't reappear from
  // internal navigation). Tied to something real (the custom font actually
  // finishing) rather than a pure guess, with a floor so it never flashes
  // by too fast to register, and a ceiling in case fonts.ready never
  // resolves for some reason.
  useEffect(() => {
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1400));
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
    Promise.race([Promise.all([minDelay, fontsReady]), timeout]).then(() => setIsBooting(false));
  }, []);

  return (
    <>
      <AnimatePresence>{isBooting && <SplashScreen />}</AnimatePresence>

      <div className="flex min-h-screen flex-col">
        <ScrollToTop />
        <Navbar />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:sectorId" element={<ProductCategory />} />
              <Route path="/about-operations" element={<AboutOperations />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Old 5-page structure — About and Capabilities merged into
                  /about-operations, Support merged into /contact. Redirects
                  so any existing bookmark/search result still lands somewhere
                  real instead of 404ing. */}
              <Route path="/about" element={<Navigate to="/about-operations" replace />} />
              <Route path="/services" element={<Navigate to="/about-operations" replace />} />
              <Route path="/dealer-support" element={<Navigate to="/contact" replace />} />

              <Route
                path="/portal"
                element={
                  <ProtectedRoute roles={[ROLE_CLIENT]}>
                    <Suspense fallback={<RouteFallback messages={PORTAL_MESSAGES} />}>
                      <PortalDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* No roles restriction — the backend endpoint it edits
                  (PUT /api/profile) has none either, any authenticated
                  account (client or staff) can edit their own name/contact. */}
              <Route
                path="/portal/profile"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<RouteFallback messages={PORTAL_MESSAGES} />}>
                      <EditProfile />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* Client-only: delivery addresses are where a client's orders
                  go. The server still scopes every request to the caller. */}
              <Route
                path="/portal/addresses"
                element={
                  <ProtectedRoute roles={[ROLE_CLIENT]}>
                    <Suspense fallback={<RouteFallback messages={PORTAL_MESSAGES} />}>
                      <ManageAddresses />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={[ROLE_ADMIN, ROLE_EMPLOYEE]}>
                    <Suspense fallback={<RouteFallback messages={ADMIN_MESSAGES} />}>
                      <AdminLayout />
                    </Suspense>
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminOrders />} />
                <Route path="clients" element={<AdminClients />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route path="leads" element={<AdminLeads />} />
                <Route path="employees" element={<AdminEmployees />} />
              </Route>
            </Routes>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </>
  );
}
