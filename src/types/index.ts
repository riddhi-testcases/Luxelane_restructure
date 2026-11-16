export interface Product {
  id: string;
  name: string;
  price: number;
  priceInr: number;
  images: string[];
  description: string;
  category: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
  discount?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface User {
  id: string;
  username: string;
}

export interface ShippingAddress {
  fullName: string;
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  status: string;
  createdAt: string;
  total: number;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
}

export interface ActivityEvent {
  event: string;
  details: Record<string, string | number>;
  createdAt: string;
}

export type ThemeMode = 'light' | 'dark';