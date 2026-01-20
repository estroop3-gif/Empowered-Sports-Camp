'use client'

/**
 * Locker Room Manager - Orders
 *
 * Admin interface for viewing and managing shop orders.
 *
 * Route: /admin/shop/orders
 */

import { useState, useEffect } from 'react'
import { AdminLayout, PageHeader, ContentCard } from '@/components/admin/admin-layout'
import { useAuth } from '@/lib/auth/context'
import {
  formatPrice,
  type ShopOrder,
} from '@/lib/services/shop'
import {
  Package,
  Search,
  Filter,
  Eye,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  DollarSign,
  Calendar,
  User,
  Mail,
  MapPin,
  ChevronDown,
  X,
} from 'lucide-react'

type StatusFilter = 'all' | 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: 'Pending', icon: Clock, className: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
  paid: { label: 'Paid', icon: DollarSign, className: 'text-neon bg-neon/10 border-neon/30' },
  processing: { label: 'Processing', icon: Package, className: 'text-purple bg-purple/10 border-purple/30' },
  shipped: { label: 'Shipped', icon: Truck, className: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  delivered: { label: 'Delivered', icon: CheckCircle, className: 'text-green-500 bg-green-500/10 border-green-500/30' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-magenta bg-magenta/10 border-magenta/30' },
}

export default function AdminOrdersPage() {
  const { user, role, tenant } = useAuth()

  const [orders, setOrders] = useState<ShopOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Order detail modal
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/shop/orders', { credentials: 'include' })
      const result = await response.json()

      if (!response.ok || result.error) {
        console.error('Failed to load orders:', result.error)
        setError('Failed to load orders')
      } else {
        setOrders(result.data || [])
      }
    } catch (err) {
      console.error('Failed to load orders:', err)
      setError('Failed to load orders')
    }

    setLoading(false)
  }

  async function handleStatusUpdate(orderId: string, newStatus: ShopOrder['status']) {
    setUpdating(true)

    try {
      const response = await fetch('/api/admin/shop/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId, status: newStatus }),
      })
      const result = await response.json()

      if (!response.ok || result.error) {
        console.error('Failed to update order:', result.error)
        setError('Failed to update order status')
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        )
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus })
        }
      }
    } catch (err) {
      console.error('Failed to update order:', err)
      setError('Failed to update order status')
    }

    setUpdating(false)
  }

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    // Search by order number or email
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !order.id.toLowerCase().includes(query) &&
        !(order.customer_email?.toLowerCase().includes(query)) &&
        !(order.customer_name?.toLowerCase().includes(query))
      ) {
        return false
      }
    }

    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false
    }

    return true
  })

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending' || o.status === 'paid').length,
    processing: orders.filter((o) => o.status === 'processing' || o.status === 'shipped').length,
    totalRevenue: orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total_cents, 0),
  }

  if (!user || (role !== 'hq_admin' && role !== 'licensee_owner')) {
    return (
      <AdminLayout
        userRole={role || 'director'}
        userName={user?.email || 'User'}
        tenantName={tenant?.name}
      >
        <div className="flex items-center justify-center py-20">
          <p className="text-white/50">You don't have permission to access this page.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      userRole={role}
      userName={user?.email || 'Admin'}
      tenantName={tenant?.name}
    >
      <PageHeader
        title="Orders"
        description="View and manage Empowered Locker orders"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Locker Room', href: '/admin/shop' },
          { label: 'Orders' },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Orders"
          value={stats.total.toString()}
          icon={Package}
          color="neon"
        />
        <StatCard
          label="Needs Action"
          value={stats.pending.toString()}
          icon={Clock}
          color={stats.pending > 0 ? 'magenta' : 'neon'}
        />
        <StatCard
          label="In Progress"
          value={stats.processing.toString()}
          icon={Truck}
          color="purple"
        />
        <StatCard
          label="Total Revenue"
          value={formatPrice(stats.totalRevenue)}
          icon={DollarSign}
          color="neon"
        />
      </div>

      {/* Filters */}
      <ContentCard className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
            <input
              type="text"
              placeholder="Search by order #, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-black border border-white/10 pl-12 pr-4 text-white placeholder:text-white/30 focus:border-neon focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-white/50" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-12 bg-black border border-white/10 px-4 text-white focus:border-neon focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </ContentCard>

      {/* Orders Table */}
      <ContentCard title="Order History">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neon" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-magenta mx-auto mb-4" />
            <p className="text-magenta mb-4">{error}</p>
            <button
              onClick={loadOrders}
              className="px-6 py-3 bg-neon text-black font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">
              {searchQuery || statusFilter !== 'all'
                ? 'No orders match your filters'
                : 'No orders yet. Orders will appear here once customers checkout.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Order
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Customer
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Date
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Total
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Status
                  </th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-white/50 pb-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onView={() => setSelectedOrder(order)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
          updating={updating}
        />
      )}
    </AdminLayout>
  )
}

/**
 * Stat Card Component
 */
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  icon: React.ElementType
  color: 'neon' | 'magenta' | 'purple'
}) {
  const colorClasses = {
    neon: 'bg-neon/10 border-neon/30 text-neon',
    magenta: 'bg-magenta/10 border-magenta/30 text-magenta',
    purple: 'bg-purple/10 border-purple/30 text-purple',
  }

  return (
    <div className="bg-black border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-white/50">
          {label}
        </span>
        <div className={`p-2 border ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  )
}

/**
 * Order Row Component
 */
function OrderRow({
  order,
  onView,
}: {
  order: ShopOrder
  onView: () => void
}) {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon

  const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      {/* Order */}
      <td className="py-4 pr-4">
        <p className="font-mono text-sm text-white">#{order.id.slice(0, 8).toUpperCase()}</p>
        {order.items && (
          <p className="text-xs text-white/40">{order.items.length} items</p>
        )}
      </td>

      {/* Customer */}
      <td className="py-4 pr-4">
        <p className="text-white">{order.customer_name || 'Guest'}</p>
        <p className="text-xs text-white/40">{order.customer_email || 'No email'}</p>
      </td>

      {/* Date */}
      <td className="py-4 pr-4">
        <span className="text-sm text-white/60">{orderDate}</span>
      </td>

      {/* Total */}
      <td className="py-4 pr-4">
        <span className="font-bold text-neon">{formatPrice(order.total_cents)}</span>
      </td>

      {/* Status */}
      <td className="py-4 pr-4">
        <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-wider border ${statusConfig.className}`}>
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </span>
      </td>

      {/* Actions */}
      <td className="py-4 text-right">
        <button
          onClick={onView}
          className="p-2 text-white/40 hover:text-neon hover:bg-neon/10 transition-colors"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

/**
 * Order Detail Modal
 */
function OrderDetailModal({
  order,
  onClose,
  onStatusUpdate,
  updating,
}: {
  order: ShopOrder
  onClose: () => void
  onStatusUpdate: (orderId: string, status: ShopOrder['status']) => void
  updating: boolean
}) {
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon

  const orderDate = new Date(order.created_at).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const statusFlow: ShopOrder['status'][] = ['pending', 'paid', 'processing', 'shipped', 'delivered']
  const currentIndex = statusFlow.indexOf(order.status)
  const nextStatus = order.status !== 'cancelled' && currentIndex < statusFlow.length - 1
    ? statusFlow[currentIndex + 1]
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-dark-100 border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Order</p>
            <h3 className="text-xl font-bold text-white">#{order.id.slice(0, 8).toUpperCase()}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider border ${statusConfig.className}`}>
              <StatusIcon className="h-4 w-4" />
              {statusConfig.label}
            </span>
            {nextStatus && order.status !== 'cancelled' && (
              <button
                onClick={() => onStatusUpdate(order.id, nextStatus)}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2 bg-neon text-black text-sm font-bold uppercase tracking-wider hover:bg-neon/90 transition-colors disabled:opacity-50"
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Mark as {STATUS_CONFIG[nextStatus]?.label}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-black border border-white/10 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
              Customer
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white">
                <User className="h-4 w-4 text-white/40" />
                {order.customer_name || 'Guest'}
              </div>
              {order.customer_email && (
                <div className="flex items-center gap-2 text-white/60">
                  <Mail className="h-4 w-4 text-white/40" />
                  {order.customer_email}
                </div>
              )}
              {order.shipping_address && (
                <div className="flex items-start gap-2 text-white/60">
                  <MapPin className="h-4 w-4 text-white/40 mt-0.5" />
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {typeof order.shipping_address === 'object'
                      ? JSON.stringify(order.shipping_address, null, 2)
                      : order.shipping_address}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-black border border-white/10 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
              Items
            </h4>
            {order.items && order.items.length > 0 ? (
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-white">Product #{item.product_id.slice(0, 8)}</p>
                      {item.variant_id && (
                        <p className="text-xs text-white/40">Variant: {item.variant_id.slice(0, 8)}</p>
                      )}
                      <p className="text-xs text-white/40">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-neon">{formatPrice(item.unit_price_cents * item.quantity)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm">No item details available</p>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-black border border-white/10 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
              Summary
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-white/60">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal_cents)}</span>
              </div>
              {order.tax_cents > 0 && (
                <div className="flex items-center justify-between text-white/60">
                  <span>Tax</span>
                  <span>{formatPrice(order.tax_cents)}</span>
                </div>
              )}
              {order.shipping_cents > 0 && (
                <div className="flex items-center justify-between text-white/60">
                  <span>Shipping</span>
                  <span>{formatPrice(order.shipping_cents)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="font-bold text-white">Total</span>
                <span className="text-xl font-black text-neon">{formatPrice(order.total_cents)}</span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {orderDate}
            </span>
            {order.stripe_checkout_session_id && (
              <span>Stripe: {order.stripe_checkout_session_id.slice(0, 20)}...</span>
            )}
          </div>

          {/* Cancel Option */}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <button
              onClick={() => onStatusUpdate(order.id, 'cancelled')}
              disabled={updating}
              className="w-full py-3 border border-magenta/30 text-magenta font-bold uppercase tracking-wider hover:bg-magenta/10 transition-colors disabled:opacity-50"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                'Cancel Order'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
