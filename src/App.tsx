import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { shallowEqual } from 'react-redux';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import ShopPage from './pages/ShopPage';
import LoginPage from './pages/LoginPage';
import CollectionsPage from './pages/CollectionsPage';
import AboutPage from './pages/AboutPage';
import SustainabilityPage from './pages/SustainabilityPage';
import SizeGuidePage from './pages/SizeGuidePage';
import FAQPage from './pages/FAQPage';
import ShippingPage from './pages/ShippingPage';
import CheckoutPage from './pages/CheckoutPage';
import AccountPage from './pages/AccountPage';

import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchProducts } from './store/slices/productsSlice';
import { userSignedOut, userUpdated } from './store/slices/authSlice';
import { apiRequest, ApiError } from './api/client';
import { User } from './types';

function App() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.mode);
  const productsStatus = useAppSelector((state) => state.products.status);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const { cart, user, wishlist } = useAppSelector((state) => ({
    cart: state.cart.items,
    user: state.auth.user,
    wishlist: state.wishlist.ids,
  }), shallowEqual);

  useEffect(() => {
    if (productsStatus === 'idle') void dispatch(fetchProducts());
  }, [dispatch, productsStatus]);

  useEffect(() => {
    if (!userId) return;
    void apiRequest<User>('/api/auth/me')
      .then((authenticatedUser) => dispatch(userUpdated(authenticatedUser)))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          dispatch(userSignedOut());
          return;
        }
        console.error('Unable to verify the saved sign-in session', error);
      });
  }, [dispatch, userId]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  }, [user]);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:category" element={<CollectionsPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/sustainability" element={<SustainabilityPage />} />
          <Route path="/size-guide" element={<SizeGuidePage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;