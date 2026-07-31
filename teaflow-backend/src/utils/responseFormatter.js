/**
 * Add MongoDB-compatible _id alias alongside Supabase id
 * This ensures frontend code using _id still works
 */
export const addIdAlias = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(addIdAlias);
  
  const result = { ...obj };
  if (result.id && !result._id) {
    result._id = result.id;
  }

  // Map nested items fields for frontend compatibility
  if (result.items && Array.isArray(result.items)) {
    result.items = result.items.map(item => {
      const mapped = { ...item };
      if (mapped.id && !mapped._id) mapped._id = mapped.id;
      if (mapped.menu_item_id) mapped.menuItemId = mapped.menu_item_id;
      if (mapped.unit_price !== undefined && mapped.unitPrice === undefined) mapped.unitPrice = mapped.unit_price;
      if (mapped.total_price !== undefined && mapped.totalPrice === undefined) mapped.totalPrice = mapped.total_price;
      return mapped;
    });
  }

  // Map order-level fields
  if (result.total_amount !== undefined && result.totalAmount === undefined) result.totalAmount = result.total_amount;
  if (result.order_number !== undefined && result.orderNumber === undefined) result.orderNumber = result.order_number;
  if (result.created_at !== undefined && result.createdAt === undefined) result.createdAt = result.created_at;
  if (result.ready_at !== undefined && result.readyAt === undefined) result.readyAt = result.ready_at;
  if (result.recall_count !== undefined && result.recallCount === undefined) result.recallCount = result.recall_count;
  if (result.last_recall_at !== undefined && result.lastRecallAt === undefined) result.lastRecallAt = result.last_recall_at;
  if (result.payment_status !== undefined && result.paymentStatus === undefined) result.paymentStatus = result.payment_status;
  if (result.updated_at !== undefined && result.updatedAt === undefined) result.updatedAt = result.updated_at;
  if (result.placed_at !== undefined && result.placedAt === undefined) result.placedAt = result.placed_at;
  if (result.completed_at !== undefined && result.completedAt === undefined) result.completedAt = result.completed_at;
  if (result.is_available !== undefined && result.isAvailable === undefined) result.isAvailable = result.is_available;
  if (result.base_price !== undefined && result.basePrice === undefined) result.basePrice = result.base_price;
  if (result.display_order !== undefined && result.displayOrder === undefined) result.displayOrder = result.display_order;
  if (result.image_url !== undefined && result.imageUrl === undefined) result.imageUrl = result.image_url;
  if (result.is_active !== undefined && result.isActive === undefined) result.isActive = result.is_active;
  if (result.shop_id !== undefined && result.shopId === undefined) result.shopId = result.shop_id;
  if (result.shop_name !== undefined && result.shopName === undefined) result.shopName = result.shop_name;

  // Map status_history items
  if (result.status_history && Array.isArray(result.status_history)) {
    result.status_history = result.status_history.map(entry => {
      const mapped = { ...entry };
      if (mapped.updated_by) mapped.updatedBy = mapped.updated_by;
      return mapped;
    });
  }
  
  return result;
};

export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res, message, statusCode = 400, errors = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

export const paginatedResponse = (res, data, pagination, message = 'Success') => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || 0,
      pages: pagination.pages || 0,
    },
  });
};
