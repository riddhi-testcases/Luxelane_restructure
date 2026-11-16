import { useAppDispatch, useAppSelector } from '../store/hooks';
import { wishlistItemAdded, wishlistItemRemoved } from '../store/slices/wishlistSlice';
import { Product } from '../types';

interface WishlistState {
  wishlist: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

export const useWishlist = (): WishlistState => {
  const dispatch = useAppDispatch();
  const wishlistIds = useAppSelector((state) => state.wishlist.ids);
  const products = useAppSelector((state) => state.products.items);

  return {
    wishlist: wishlistIds
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is Product => product !== undefined),
    addToWishlist: (product) => dispatch(wishlistItemAdded(product.id)),
    removeFromWishlist: (productId) => dispatch(wishlistItemRemoved(productId)),
    isInWishlist: (productId) => wishlistIds.includes(productId),
  };
};
