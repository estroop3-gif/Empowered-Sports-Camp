'use client'

/**
 * Create New Product Page
 *
 * Form for creating a new shop product.
 *
 * Route: /admin/shop/products/new
 */

import ProductForm from '../_components/ProductForm'

export default function NewProductPage() {
  return <ProductForm mode="create" />
}
