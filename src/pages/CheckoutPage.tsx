import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { apiRequest } from '../api/client';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch } from '../store/hooks';
import { cartCleared } from '../store/slices/cartSlice';
import { Order, ShippingAddress } from '../types';

const CheckoutPage: React.FC = () => {
  const { cart, cartTotal } = useCart();
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '',
    addressLine: '',
    city: '',
    postalCode: '',
    country: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateAddress = (field: keyof ShippingAddress, value: string) => {
    setShippingAddress((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated || cart.length === 0) return;

    setError('');
    setIsSubmitting(true);
    try {
      await apiRequest<Order>('/api/orders', {
        method: 'POST',
        body: {
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          shippingAddress,
        },
      });
      dispatch(cartCleared());
      navigate('/account', { state: { orderPlaced: true } });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to place your order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-serif font-medium mb-4">Sign in to checkout</h1>
        <p className="mb-8 text-gray-600 dark:text-gray-400">Your account is needed to place an order and view order history.</p>
        <Button as={Link} to="/login" variant="primary">Sign In</Button>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-serif font-medium mb-4">Your cart is empty</h1>
        <Button as={Link} to="/shop" variant="primary">Continue Shopping</Button>
      </div>
    );
  }

  const addressFields: Array<{ key: keyof ShippingAddress; label: string; autoComplete: string }> = [
    { key: 'fullName', label: 'Full name', autoComplete: 'name' },
    { key: 'addressLine', label: 'Street address', autoComplete: 'street-address' },
    { key: 'city', label: 'City', autoComplete: 'address-level2' },
    { key: 'postalCode', label: 'Postal code', autoComplete: 'postal-code' },
    { key: 'country', label: 'Country', autoComplete: 'country-name' },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-medium text-gray-900 dark:text-gray-100 mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
          <h2 className="text-xl font-medium">Delivery details</h2>
          {addressFields.map(({ key, label, autoComplete }) => (
            <div key={key}>
              <label htmlFor={key} className="block text-sm font-medium mb-1">{label}</label>
              <input
                id={key}
                name={key}
                autoComplete={autoComplete}
                value={shippingAddress[key]}
                onChange={(event) => updateAddress(key, event.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
                required
                maxLength={240}
              />
            </div>
          ))}
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
            Place Order — No Online Payment
          </Button>
        </form>

        <aside className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 h-fit">
          <h2 className="text-lg font-medium mb-4">Order Summary</h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.product.id} className="flex justify-between gap-4 text-sm">
                <span>{item.product.name} × {item.quantity}</span>
                <span>${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            This demo records your order but does not charge a payment method.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default CheckoutPage;
