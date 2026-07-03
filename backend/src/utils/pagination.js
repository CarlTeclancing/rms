export const getPagination = (query) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 10), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

export const paginatedResponse = (items, total, page, limit) => ({
  items,
  meta: {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  }
});
