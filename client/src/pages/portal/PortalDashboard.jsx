import { Link } from 'react-router-dom';
import { Package, RotateCcw, LogOut, AlertCircle, CheckCircle2, Truck, UserCog, MapPin } from 'lucide-react';
import PageWrapper from '../../components/PageWrapper.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { RevealGroup, RevealItem } from '../../components/Reveal.jsx';
import { useOrders, useReorder, useConfirmDelivery } from '../../lib/useOrders.js';
import { useAuthStore } from '../../store/authStore.js';
import { useLogout } from '../../lib/useLogout.js';

export default function PortalDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: orders, isLoading, isError } = useOrders();
  const reorder = useReorder();
  const confirmDelivery = useConfirmDelivery();

  return (
    <PageWrapper>
      <section className="bg-bg pt-14 pb-20">
        <div className="mx-auto max-w-container px-7">
          <div className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-8">
            <div>
              <div className="font-mono text-[12.5px] font-medium uppercase tracking-[0.14em] text-accent">Portal</div>
              <h1 className="mt-2.5 text-[26px] font-bold leading-tight text-text">Welcome, {user?.name}</h1>
              {user?.companyName && <p className="mt-1 text-[17.5px] text-text-secondary">{user.companyName}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/portal/profile"
                className="inline-flex items-center gap-2 border-2 border-hairline px-4 py-2.5 text-[17.5px] font-semibold text-text-secondary hover:border-brand hover:text-brand"
              >
                <UserCog size={15} /> Edit Profile
              </Link>
              <Link
                to="/portal/addresses"
                className="inline-flex items-center gap-2 border-2 border-hairline px-4 py-2.5 text-[17.5px] font-semibold text-text-secondary hover:border-brand hover:text-brand"
              >
                <MapPin size={15} /> Addresses
              </Link>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 border-2 border-hairline px-4 py-2.5 text-[17.5px] font-semibold text-text-secondary hover:border-brand hover:text-brand"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>

          {isLoading && <div className="py-16 text-center text-[17.5px] text-text-muted">Loading your orders…</div>}
          {isError && (
            <div role="alert" className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> Could not load your orders. Try refreshing.
            </div>
          )}

          {!isLoading && !isError && orders?.length === 0 && (
            <div className="border border-dashed border-hairline bg-surface p-12 text-center">
              <Package className="mx-auto mb-3 text-text-muted" size={26} strokeWidth={1.5} />
              <p className="text-[17.5px] text-text-secondary">No orders yet. Call us to place your first bulk order.</p>
            </div>
          )}

          {!isLoading && !isError && orders?.length > 0 && (
            <RevealGroup className="space-y-4">
              {orders.map((order) => (
                <RevealItem key={order.id}>
                  <div className="border-2 border-hairline bg-surface p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[13.5px] text-text-muted">Order #{order.id}</div>
                        <div className="mt-1 text-[17.5px] text-text-secondary">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-hairline pt-4">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between text-[17.5px] text-text-secondary">
                          <span>
                            {item.product?.name} <span className="text-text-muted">× {item.quantity}</span> @ ₹{Number(item.rate).toFixed(2)}
                          </span>
                          <span className="font-semibold text-text">₹{(item.rate * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
                      <div className="text-[17.5px] text-text-secondary">
                        Total volume: <span className="font-semibold text-text">{order.totalVolume}</span> · Total:{' '}
                        <span className="font-semibold text-text">₹{Number(order.totalAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {order.status === 'Dispatched' && (
                          <button
                            onClick={() => confirmDelivery.mutate(order.id)}
                            disabled={confirmDelivery.isPending && confirmDelivery.variables === order.id}
                            className="inline-flex items-center gap-2 border-2 border-success px-4 py-2 text-[18.5px] font-semibold text-success hover:bg-success/5 disabled:opacity-50"
                          >
                            <Truck size={14} />
                            {confirmDelivery.isPending && confirmDelivery.variables === order.id ? 'Confirming…' : 'Confirm Delivery'}
                          </button>
                        )}
                        <button
                          onClick={() => reorder.mutate(order.id)}
                          disabled={reorder.isPending}
                          className="inline-flex items-center gap-2 border-2 border-hairline px-4 py-2 text-[18.5px] font-semibold text-brand hover:border-brand disabled:opacity-50"
                        >
                          <RotateCcw size={14} /> Quick Re-order
                        </button>
                      </div>
                    </div>

                    {confirmDelivery.isError && confirmDelivery.variables === order.id && (
                      <div role="alert" className="mt-3 flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3 text-[17.5px] text-error">
                        <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {confirmDelivery.error.message}
                      </div>
                    )}
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          )}

          {confirmDelivery.isSuccess && (
            <div role="status" className="mt-5 flex items-start gap-2 border border-success/30 bg-success/5 px-4 py-3.5 text-[17.5px] text-success">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> Delivery confirmed — thanks for letting us know.
            </div>
          )}
          {reorder.isSuccess && (
            <div role="status" className="mt-5 flex items-start gap-2 border border-success/30 bg-success/5 px-4 py-3.5 text-[17.5px] text-success">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> New order placed from that reorder — see it above.
            </div>
          )}
          {reorder.isError && (
            <div role="alert" className="mt-5 flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {reorder.error.message}
            </div>
          )}
        </div>
      </section>
    </PageWrapper>
  );
}
