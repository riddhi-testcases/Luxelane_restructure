import { useAppDispatch, useAppSelector } from '../store/hooks';
import { cartCleared, cartItemAdded, cartItemRemoved, cartQuantityUpdated } from '../store/slices/cartSlice';
import { CartItem, Product } from '../types';

interface CartState {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
}

export const useCart = (): CartState => {
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart.items);

  return {
    cart,
    addToCart: (product, quantity = 1) => dispatch(cartItemAdded({ product, quantity })),
    removeFromCart: (productId) => dispatch(cartItemRemoved(productId)),
    updateQuantity: (productId, quantity) => dispatch(cartQuantityUpdated({ productId, quantity })),
    clearCart: () => dispatch(cartCleared()),
    cartTotal: cart.reduce((total, item) => total + item.product.price * item.quantity, 0),
    itemCount: cart.reduce((count, item) => count + item.quantity, 0),
  };
};
