import React from 'react';
import { Product } from '../../types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  error?: string | null;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, title, subtitle, isLoading = false, error }) => {
  return (
    <div className="py-12">
      {(title || subtitle) && (
        <div className="text-center mb-12">
          {title && <h2 className="text-3xl font-serif font-medium tracking-tight text-gray-900 dark:text-gray-100">{title}</h2>}
          {subtitle && <p className="mt-2 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">{subtitle}</p>}
        </div>
      )}
      
      {isLoading ? (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">Loading products...</p>
      ) : error ? (
        <p role="alert" className="py-8 text-center text-red-600 dark:text-red-400">{error}</p>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-gray-500 dark:text-gray-400">No products found.</p>
      )}
    </div>
  );
};

export default ProductGrid;