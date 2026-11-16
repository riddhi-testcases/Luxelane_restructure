import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { apiRequest } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { ActivityEvent, Order } from '../types';

const eventLabels: Record<string, string> = {
  account_registered: 'Account created',
  signed_in: 'Signed in',
  signed_out: 'Signed out',
  order_placed: 'Order placed',
};

const AccountPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const orderPlaced = (location.state as { orderPlaced?: boolean } | null)?.orderPlaced;

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    let isCurrent = true;
    Promise.all([
      apiRequest<Order[]>('/api/orders/me'),
      apiRequest<ActivityEvent[]>('/api/users/me/activity'),
    ])
      .then(([savedOrders, savedActivity]) => {
        if (!isCurrent) return;
        setOrders(savedOrders);
        setActivity(savedActivity);
      })
      .catch((requestError: unknown) => {
        if (isCurrent) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load account history');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await logout();
      navigate('/login');
    } catch (requestError) {
      setLogoutError(requestError instanceof Error ? requestError.message : 'Unable to sign out');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-serif font-medium mb-4">Your account</h1>
        <p className="mb-8 text-gray-600 dark:text-gray-400">Sign in to view your account and order history.</p>
        <Button as={Link} to="/login" variant="primary">Sign In</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-medium text-gray-900 dark:text-gray-100">Your Account</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Signed in as {user?.username}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>Sign Out</Button>
      </div>

      {orderPlaced && (
        <div role="status" className="mb-8 rounded-md bg-green-50 dark:bg-green-900/20 p-4 text-green-800 dark:text-green-300">
          Your order was placed successfully. No payment was charged.
        </div>
      )}
      {error && <p role="alert" className="mb-6 text-red-600 dark:text-red-400">{error}</p>}
      {logoutError && <p role="alert" className="mb-6 text-red-600 dark:text-red-400">{logoutError}</p>}

      <section className="mb-12">
        <h2 className="text-2xl font-serif font-medium mb-5">Order History</h2>
        {isLoading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-6">
            <p className="text-gray-600 dark:text-gray-400">You haven’t placed an order yet.</p>
            <Link to="/shop" className="mt-3 inline-block text-primary dark:text-primary-light hover:underline">Browse the shop</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <article key={order.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-wrap justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
                  <div>
                    <h3 className="font-medium">Order #{order.id.slice(0, 8)}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium capitalize">{order.status}</p>
                    <p className="mt-1">${order.total.toFixed(2)} · No online payment</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {order.items.map((item) => (
                    <li key={`${order.id}-${item.productId}`} className="flex justify-between gap-4 text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span>${item.lineTotal.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Shipping to {order.shippingAddress.fullName}, {order.shippingAddress.city}, {order.shippingAddress.country}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-serif font-medium mb-5">Recent Account Activity</h2>
        {isLoading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading activity...</p>
        ) : activity.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {activity.map((event, index) => (
              <li key={`${event.event}-${event.createdAt}-${index}`} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
                <span>{eventLabels[event.event] ?? event.event}</span>
                <time dateTime={event.createdAt} className="text-gray-500 dark:text-gray-400">
                  {new Date(event.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AccountPage;
