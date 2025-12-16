/**
 * Services Index
 *
 * Re-exports all service modules for cleaner imports.
 */

// Camp services
export {
  fetchPublicCamps,
  fetchCampBySlug,
  fetchCampById,
  fetchFeaturedCamps,
  fetchCampsByLocation,
  fetchCampCities,
  fetchCampStates,
  fetchProgramTypes,
  formatPrice as formatCampPrice,
  formatDateRange,
  formatAgeRange,
  getProgramTypeLabel,
  type PublicCampCard,
  type CampFilters,
  type CampSearchResult,
} from './camps'

// Shop services
export {
  getActiveProducts,
  getProductBySlug,
  getProductById,
  getProductsByIds,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  createOrder,
  updateOrderStatus,
  updateOrderByStripeSession,
  getAdminOrders,
  getUserOrders,
  getShopSetting,
  getShopSettings,
  upsertShopSetting,
  formatPrice as formatShopPrice,
  generateSlug,
  calculateCartTotals,
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  type ShopProduct,
  type ShopProductVariant,
  type ShopOrder,
  type ShopOrderItem,
  type ShopSettings,
  type CartItem,
} from './shop'

// Job Application services
export {
  createJobApplication,
  listJobApplications,
  getJobApplicationById,
  updateJobApplicationStatus,
  addJobApplicationNote,
  deleteJobApplicationNote,
  addJobApplicationAttachment,
  deleteJobApplicationAttachment,
  getJobApplicationCounts,
  deleteJobApplication,
  getJobsWithApplicationCounts,
  type JobApplication,
  type JobApplicationAttachment,
  type JobApplicationInternalNote,
  type JobApplicationStatusChange,
  type JobApplicationWithDetails,
  type CreateJobApplicationInput,
  type ListJobApplicationsFilters,
  type ListJobApplicationsOptions,
  type ListJobApplicationsResult,
  type JobApplicationCounts,
} from './jobApplications'
