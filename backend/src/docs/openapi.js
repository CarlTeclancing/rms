export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Restaurant Management System API',
    version: '1.0.0',
    description: 'API documentation for the ChopASAP restaurant management backend.'
  },
  servers: [
    { url: '/api', description: 'Current host' },
    { url: 'http://localhost:5000/api', description: 'Local development' }
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Public Portal' },
    { name: 'Dashboard' },
    { name: 'Menu' },
    { name: 'Sales' },
    { name: 'Online Orders' },
    { name: 'Reservations' },
    { name: 'Stock' },
    { name: 'Expenses' },
    { name: 'Reports' },
    { name: 'Promotions' },
    { name: 'Users' },
    { name: 'Uploads' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'object' } }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'app@chopasap.com' },
          password: { type: 'string', example: 'Use your admin password' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          role: { $ref: '#/components/schemas/Role' }
        }
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          permissions: { type: 'array', items: { type: 'string' } }
        }
      },
      AppSettings: {
        type: 'object',
        properties: {
          restaurantName: { type: 'string', example: 'ChopASAP' },
          shortName: { type: 'string', example: 'ChopASAP' },
          currency: { type: 'string', example: 'XAF' },
          deliveryFee: { type: 'number', example: 1000 },
          publicOrdering: { type: 'boolean', example: true },
          reservations: { type: 'boolean', example: true },
          supportPhone: { type: 'string', example: '+237671286999' }
        }
      },
      MenuCategory: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true }
        }
      },
      MenuVariation: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'With fish' },
          price: { type: 'number', example: 3500 }
        }
      },
      MenuItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'number' },
          variations: { type: 'array', items: { $ref: '#/components/schemas/MenuVariation' } },
          imageUrl: { type: 'string', nullable: true },
          isAvailable: { type: 'boolean' },
          categoryId: { type: 'string' },
          category: { $ref: '#/components/schemas/MenuCategory' }
        }
      },
      MenuItemInput: {
        type: 'object',
        required: ['name', 'price', 'categoryId'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          variations: { type: 'array', items: { $ref: '#/components/schemas/MenuVariation' } },
          imageUrl: { type: 'string' },
          isAvailable: { type: 'boolean' },
          categoryId: { type: 'string' },
          recipeIngredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ingredientId: { type: 'string' },
                quantity: { type: 'number' }
              }
            }
          }
        }
      },
      OnlineOrderInput: {
        type: 'object',
        required: ['customerName', 'customerPhone', 'deliveryAddress', 'items'],
        properties: {
          customerName: { type: 'string' },
          customerPhone: { type: 'string' },
          customerEmail: { type: 'string', format: 'email' },
          deliveryAddress: { type: 'string' },
          deliveryNote: { type: 'string' },
          deliveryFee: { type: 'number' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['menuItemId', 'quantity'],
              properties: {
                menuItemId: { type: 'string' },
                variationName: { type: 'string', example: 'With chicken' },
                quantity: { type: 'integer', minimum: 1 }
              }
            }
          }
        }
      },
      OnlineOrder: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          orderNo: { type: 'string' },
          customerName: { type: 'string' },
          customerPhone: { type: 'string' },
          deliveryAddress: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] },
          subtotal: { type: 'number' },
          deliveryFee: { type: 'number' },
          total: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                menuItemId: { type: 'string' },
                variationName: { type: 'string', nullable: true },
                quantity: { type: 'integer' },
                unitPrice: { type: 'number' },
                total: { type: 'number' }
              }
            }
          }
        }
      },
      ReservationInput: {
        type: 'object',
        required: ['customerName', 'customerPhone', 'partySize', 'reservationAt'],
        properties: {
          customerName: { type: 'string' },
          customerPhone: { type: 'string' },
          customerEmail: { type: 'string', format: 'email' },
          partySize: { type: 'integer', minimum: 1 },
          mealPreference: { type: 'string' },
          reservationAt: { type: 'string', format: 'date-time' },
          note: { type: 'string' }
        }
      },
      SaleInput: {
        type: 'object',
        required: ['items'],
        properties: {
          paymentMethod: { type: 'string', enum: ['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER'] },
          amountPaid: { type: 'number' },
          discount: { type: 'number' },
          tax: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['menuItemId', 'quantity'],
              properties: {
                menuItemId: { type: 'string' },
                quantity: { type: 'integer', minimum: 1 }
              }
            }
          }
        }
      },
      StockItemInput: {
        type: 'object',
        required: ['name', 'unit'],
        properties: {
          name: { type: 'string' },
          unit: { type: 'string' },
          quantity: { type: 'number' },
          reorderLevel: { type: 'number' },
          unitCost: { type: 'number' },
          ingredientId: { type: 'string' },
          supplierId: { type: 'string' }
        }
      },
      ExpenseInput: {
        type: 'object',
        required: ['title', 'amount', 'categoryId'],
        properties: {
          title: { type: 'string' },
          amount: { type: 'number' },
          note: { type: 'string' },
          receiptUrl: { type: 'string' },
          categoryId: { type: 'string' },
          supplierId: { type: 'string' },
          expenseDate: { type: 'string', format: 'date-time' }
        }
      },
      PromotionInput: {
        type: 'object',
        required: ['businessName', 'contactName', 'contactPhone', 'title', 'description'],
        properties: {
          businessName: { type: 'string' },
          contactName: { type: 'string' },
          contactPhone: { type: 'string' },
          contactEmail: { type: 'string', format: 'email' },
          title: { type: 'string' },
          description: { type: 'string' },
          imageUrl: { type: 'string' },
          ctaLabel: { type: 'string' },
          ctaUrl: { type: 'string' },
          placement: { type: 'string', enum: ['PORTAL_HOME', 'MENU_TOP', 'CATEGORY'] },
          status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAUSED'] },
          adminNote: { type: 'string' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' }
        }
      }
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required or token expired',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
      },
      Forbidden: {
        description: 'Missing required permission',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
      },
      ValidationError: {
        description: 'Validation failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
      }
    }
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a JWT',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'Authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/settings': {
      get: {
        tags: ['Users'],
        summary: 'Get admin storefront settings',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Storefront settings', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppSettings' } } } },
          401: { $ref: '#/components/responses/Unauthorized' }
        }
      },
      put: {
        tags: ['Users'],
        summary: 'Update storefront settings',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AppSettings' } } } },
        responses: {
          200: { description: 'Settings updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppSettings' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' }
        }
      }
    },
    '/public/menu': {
      get: {
        tags: ['Public Portal'],
        summary: 'List menu items available to customers',
        responses: { 200: { description: 'Public menu list' } }
      }
    },
    '/public/settings': {
      get: {
        tags: ['Public Portal'],
        summary: 'Get public storefront settings',
        responses: { 200: { description: 'Storefront settings', content: { 'application/json': { schema: { $ref: '#/components/schemas/AppSettings' } } } } }
      }
    },
    '/public/orders/{id}': {
      get: {
        tags: ['Public Portal'],
        summary: 'Get a public online order by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Online order', content: { 'application/json': { schema: { $ref: '#/components/schemas/OnlineOrder' } } } }, 404: { description: 'Order not found' } }
      }
    },
    '/public/orders': {
      post: {
        tags: ['Public Portal'],
        summary: 'Create an online delivery order',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OnlineOrderInput' } } } },
        responses: {
          201: { description: 'Order created', content: { 'application/json': { schema: { $ref: '#/components/schemas/OnlineOrder' } } } },
          422: { $ref: '#/components/responses/ValidationError' }
        }
      }
    },
    '/public/reservations': {
      post: {
        tags: ['Public Portal'],
        summary: 'Create a public meal reservation',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReservationInput' } } } },
        responses: { 201: { description: 'Reservation created' }, 422: { $ref: '#/components/responses/ValidationError' } }
      }
    },
    '/public/promotions': {
      get: { tags: ['Public Portal'], summary: 'List approved public promotions', responses: { 200: { description: 'Promotion list' } } },
      post: {
        tags: ['Public Portal'],
        summary: 'Submit a promotion request',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PromotionInput' } } } },
        responses: { 201: { description: 'Promotion request submitted' }, 422: { $ref: '#/components/responses/ValidationError' } }
      }
    },
    '/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get dashboard metrics',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Dashboard stats' }, 401: { $ref: '#/components/responses/Unauthorized' } }
      }
    },
    '/analytics/business-intelligence': {
      get: {
        tags: ['Reports'],
        summary: 'Get business intelligence report data',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } }
        ],
        responses: { 200: { description: 'Business intelligence data' }, 403: { $ref: '#/components/responses/Forbidden' } }
      }
    },
    '/menu-items': {
      get: {
        tags: ['Menu'],
        summary: 'List menu items',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Paginated menu item list' } }
      },
      post: {
        tags: ['Menu'],
        summary: 'Create a menu item',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MenuItemInput' } } } },
        responses: { 201: { description: 'Menu item created', content: { 'application/json': { schema: { $ref: '#/components/schemas/MenuItem' } } } } }
      }
    },
    '/menu-items/{id}': {
      put: {
        tags: ['Menu'],
        summary: 'Update a menu item',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MenuItemInput' } } } },
        responses: { 200: { description: 'Menu item updated' } }
      },
      delete: {
        tags: ['Menu'],
        summary: 'Delete a menu item',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Menu item deleted' } }
      }
    },
    '/menu-categories': {
      get: { tags: ['Menu'], summary: 'List menu categories', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Category list' } } },
      post: {
        tags: ['Menu'],
        summary: 'Create a menu category',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MenuCategory' } } } },
        responses: { 201: { description: 'Category created' } }
      }
    },
    '/ingredients': {
      get: { tags: ['Menu'], summary: 'List ingredients', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Ingredient list' } } }
    },
    '/sales': {
      get: { tags: ['Sales'], summary: 'List POS sales', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated sales list' } } },
      post: {
        tags: ['Sales'],
        summary: 'Create POS sale',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SaleInput' } } } },
        responses: { 201: { description: 'Sale created' } }
      }
    },
    '/online-orders': {
      get: { tags: ['Online Orders'], summary: 'List online orders', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Online order list' } } }
    },
    '/online-orders/{id}/status': {
      put: {
        tags: ['Online Orders'],
        summary: 'Update online order status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] } }
              }
            }
          }
        },
        responses: { 200: { description: 'Order status updated' } }
      }
    },
    '/reservations': {
      get: { tags: ['Reservations'], summary: 'List reservations', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Reservation list' } } }
    },
    '/reservations/{id}/status': {
      put: {
        tags: ['Reservations'],
        summary: 'Update reservation status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED'] } } } } }
        },
        responses: { 200: { description: 'Reservation status updated' } }
      }
    },
    '/stock-items': {
      get: { tags: ['Stock'], summary: 'List stock items', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated stock item list' } } },
      post: {
        tags: ['Stock'],
        summary: 'Create stock item',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/StockItemInput' } } } },
        responses: { 201: { description: 'Stock item created' } }
      }
    },
    '/stock-items/{id}': {
      put: { tags: ['Stock'], summary: 'Update stock item', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Stock item updated' } } },
      delete: { tags: ['Stock'], summary: 'Delete stock item', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Stock item deleted' } } }
    },
    '/stock-movements': {
      get: { tags: ['Stock'], summary: 'List stock movements', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Stock movement list' } } },
      post: {
        tags: ['Stock'],
        summary: 'Record stock movement',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['stockItemId', 'type', 'quantity'], properties: { stockItemId: { type: 'string' }, type: { type: 'string', enum: ['IN', 'OUT', 'ADJUSTMENT'] }, quantity: { type: 'number' }, note: { type: 'string' } } } } }
        },
        responses: { 201: { description: 'Stock movement recorded' } }
      }
    },
    '/suppliers': {
      get: { tags: ['Stock'], summary: 'List suppliers', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Supplier list' } } }
    },
    '/expenses': {
      get: { tags: ['Expenses'], summary: 'List expenses', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated expense list' } } },
      post: {
        tags: ['Expenses'],
        summary: 'Create expense',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ExpenseInput' } } } },
        responses: { 201: { description: 'Expense created' } }
      }
    },
    '/expenses/{id}': {
      put: { tags: ['Expenses'], summary: 'Update expense', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Expense updated' } } },
      delete: { tags: ['Expenses'], summary: 'Delete expense', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Expense deleted' } } }
    },
    '/expense-categories': {
      get: { tags: ['Expenses'], summary: 'List expense categories', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Expense category list' } } }
    },
    '/reports/sales': {
      get: { tags: ['Reports'], summary: 'Get sales report', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Sales report' } } }
    },
    '/reports/expenses': {
      get: { tags: ['Reports'], summary: 'Get expenses report', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Expenses report' } } }
    },
    '/promotions': {
      get: { tags: ['Promotions'], summary: 'List promotions', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Promotion list' } } },
      post: {
        tags: ['Promotions'],
        summary: 'Create promotion',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PromotionInput' } } } },
        responses: { 201: { description: 'Promotion created' } }
      }
    },
    '/promotions/{id}': {
      put: { tags: ['Promotions'], summary: 'Update promotion', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Promotion updated' } } },
      delete: { tags: ['Promotions'], summary: 'Delete promotion', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Promotion deleted' } } }
    },
    '/users': {
      get: { tags: ['Users'], summary: 'List users', security: [{ bearerAuth: [] }], responses: { 200: { description: 'User list' } } },
      post: {
        tags: ['Users'],
        summary: 'Create user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'password', 'roleId'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, roleId: { type: 'string' } } } } }
        },
        responses: { 201: { description: 'User created' } }
      }
    },
    '/users/{id}': {
      put: { tags: ['Users'], summary: 'Update user', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'User updated' } } },
      delete: { tags: ['Users'], summary: 'Delete user', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'User deleted' } } }
    },
    '/roles': {
      get: { tags: ['Users'], summary: 'List roles', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Role list' } } },
      post: {
        tags: ['Users'],
        summary: 'Create role',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Role' } } } },
        responses: { 201: { description: 'Role created' } }
      }
    },
    '/upload/image': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload a menu/app image',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' }, folder: { type: 'string' } } } } } },
        responses: { 200: { description: 'Image uploaded' } }
      }
    },
    '/upload/receipt': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload an expense receipt',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { receipt: { type: 'string', format: 'binary' } } } } } },
        responses: { 200: { description: 'Receipt uploaded' } }
      }
    },
    '/public/upload/promotion-image': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload a public promotion image',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } } },
        responses: { 200: { description: 'Promotion image uploaded' } }
      }
    }
  }
};
