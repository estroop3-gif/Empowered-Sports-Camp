'use client'

/**
 * Edit Product Page
 *
 * Form for editing an existing shop product.
 *
 * Route: /admin/shop/products/[id]
 */

import { useParams } from 'next/navigation'
import ProductForm from '../_components/ProductForm'

export default function EditProductPage() {
  const params = useParams()
  const productId = params.id as string

  return <ProductForm mode="edit" productId={productId} />
}
