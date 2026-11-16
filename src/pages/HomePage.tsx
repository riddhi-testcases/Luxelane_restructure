import React, { useEffect } from 'react';
import Hero from '../components/home/Hero';
import ProductGrid from '../components/product/ProductGrid';
import FeaturedCategories from '../components/home/FeaturedCategories';
import Newsletter from '../components/home/Newsletter';
import Testimonials from '../components/home/Testimonials';
import { useAppSelector } from '../store/hooks';
import { shallowEqual } from 'react-redux';

const HomePage: React.FC = () => {
  const { products, status, error } = useAppSelector((state) => ({
    products: state.products.items,
    status: state.products.status,
    error: state.products.error,
  }), shallowEqual);
  const featuredProducts = products.filter((product) => product.isFeatured);
  const newArrivals = products.filter((product) => product.isNew);
  const isLoading = status === 'idle' || status === 'loading';

  useEffect(() => {
    // Update page title
    document.title = 'Luxe Lane | by Riddhi';
  }, []);

  return (
    <div>
      <Hero />
      
      <div className="container mx-auto px-4">
        <ProductGrid 
          products={newArrivals}
          isLoading={isLoading}
          error={error}
          title="New Arrivals"
          subtitle="Discover our latest pieces, thoughtfully designed for the modern woman."
        />
      </div>

      <FeaturedCategories />

      <div className="container mx-auto px-4">
        <ProductGrid 
          products={featuredProducts}
          isLoading={isLoading}
          error={error}
          title="Featured Collection"
          subtitle="Curated selection of our most coveted pieces this season."
        />
      </div>

      <Testimonials />
      <Newsletter />
    </div>
  );
};

export default HomePage;