export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tabme API',
      version: '1.0.0',
      description: 'The backend API for the Tabme Chrome Extension. It provides services for user authentication, data storage, and synchronization of spaces, folders, bookmarks, and sticky notes across devices.',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            subscriptionStatus: {
              type: 'string',
              enum: ['free', 'pro'],
              description: 'User subscription status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update timestamp',
            },
          },
        },
        UserSettings: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Settings ID',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
            },
            theme: {
              type: 'string',
              enum: ['light', 'dark'],
              default: 'light',
              description: 'UI theme preference',
            },
            reverseTabOrder: {
              type: 'boolean',
              default: false,
              description: 'Whether to reverse tab order in open tabs panel',
            },
            enableTooltips: {
              type: 'boolean',
              default: true,
              description: 'Whether to show tooltips',
            },
            enableKeyboardShortcuts: {
              type: 'boolean',
              default: true,
              description: 'Whether to enable keyboard shortcuts',
            },
            autoRefreshFavicons: {
              type: 'boolean',
              default: true,
              description: 'Whether to automatically refresh favicons',
            },
          },
        },
        Space: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Space ID',
            },
            title: {
              type: 'string',
              description: 'Space title',
            },
            position: {
              type: 'string',
              description: 'Position for ordering spaces',
            },
            folders: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Folder',
              },
            },
            widgets: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Widget',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Folder: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Folder ID',
            },
            spaceId: {
              type: 'string',
              format: 'uuid',
              description: 'Space ID this folder belongs to',
            },
            title: {
              type: 'string',
              description: 'Folder title',
            },
            color: {
              type: 'string',
              description: 'Folder color',
            },
            position: {
              type: 'string',
              description: 'Position for ordering folders',
            },
            collapsed: {
              type: 'boolean',
              description: 'Whether folder is collapsed',
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/BookmarkItem',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        BookmarkItem: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Bookmark item ID',
            },
            folderId: {
              type: 'string',
              format: 'uuid',
              description: 'Folder ID this item belongs to',
            },
            title: {
              type: 'string',
              description: 'Bookmark title',
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Bookmark URL',
            },
            favicon: {
              type: 'string',
              format: 'uri',
              description: 'Favicon URL',
            },
            position: {
              type: 'string',
              description: 'Position for ordering items',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Widget: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Widget ID',
            },
            spaceId: {
              type: 'string',
              format: 'uuid',
              description: 'Space ID this widget belongs to',
            },
            pos: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                w: { type: 'number' },
                h: { type: 'number' },
                zIndex: { type: 'number' },
              },
            },
            content: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['sticky-note'],
                },
                text: {
                  type: 'string',
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        SyncChange: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'],
            },
            entityType: {
              type: 'string',
              description: 'Type of entity (space, folder, item, widget)',
            },
            entityId: {
              type: 'string',
              description: 'ID of the entity',
            },
            data: {
              type: 'object',
              description: 'Entity data',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        SyncLog: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            operation: {
              type: 'string',
              enum: ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'],
            },
            entityType: {
              type: 'string',
            },
            entityId: {
              type: 'string',
            },
            data: {
              type: 'object',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
  },
  apis: [
    './src/routes/*.ts', // Path to the API files
  ],
};