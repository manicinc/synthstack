import { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import { FastifySwaggerUiOptions } from '@fastify/swagger-ui';

/**
 * Swagger/OpenAPI configuration
 */
export const swaggerConfig: FastifyDynamicSwaggerOptions = {
  openapi: {
    openapi: '3.0.3',
    info: {
      title: 'SynthStack API Gateway',
      description: 'Comprehensive API for SynthStack AgencyOS features including client portal, proposals, CRM, and more',
      version: '1.0.0',
      contact: {
        name: 'SynthStack Team',
        email: 'team@manic.agency',
        url: 'https://synthstack.ai'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.synthstack.ai',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and authorization endpoints'
      },
      {
        name: 'Client Portal',
        description: 'Client portal endpoints for projects, tasks, and files'
      },
      {
        name: 'Proposals',
        description: 'Proposal management and e-signature endpoints'
      },
      {
        name: 'Invoices',
        description: 'Invoice management endpoints'
      },
      {
        name: 'Conversations',
        description: 'Messaging and conversation endpoints'
      },
      {
        name: 'Activities',
        description: 'CRM activity tracking endpoints'
      },
      {
        name: 'Help Center',
        description: 'Help documentation endpoints'
      },
      {
        name: 'i18n',
        description: 'Internationalization endpoints'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for server-to-server authentication'
        }
      },
      schemas: {
        // Error schemas
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error name'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            },
            path: {
              type: 'string',
              description: 'Request path'
            }
          },
          required: ['error', 'message', 'statusCode', 'timestamp', 'path']
        },

        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'ValidationError'
            },
            message: {
              type: 'string',
              example: 'Validation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },

        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com'
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'password123'
            }
          }
        },

        LoginResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                first_name: { type: 'string' },
                last_name: { type: 'string' }
              }
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token'
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token'
            }
          }
        },

        // Portal schemas
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            status: {
              type: 'string',
              enum: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']
            },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            budget: { type: 'number' },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },

        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled']
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high']
            },
            due_date: { type: 'string', format: 'date' },
            assigned_to: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            invoice_number: { type: 'string' },
            project_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled']
            },
            issue_date: { type: 'string', format: 'date' },
            due_date: { type: 'string', format: 'date' },
            total: { type: 'number' },
            paid_at: { type: 'string', format: 'date-time', nullable: true },
            line_items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unit_price: { type: 'number' },
                  total: { type: 'number' }
                }
              }
            }
          }
        },

        Proposal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            subtitle: { type: 'string', nullable: true },
            project_id: { type: 'string', format: 'uuid', nullable: true },
            client_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']
            },
            proposal_date: { type: 'string', format: 'date' },
            valid_until: { type: 'string', format: 'date' },
            total_value: { type: 'number' },
            requires_signature: { type: 'boolean' },
            signed_at: { type: 'string', format: 'date-time', nullable: true },
            signed_by_name: { type: 'string', nullable: true }
          }
        },

        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            subject: { type: 'string' },
            related_collection: {
              type: 'string',
              enum: ['projects', 'proposals', 'invoices']
            },
            related_item_id: { type: 'string', format: 'uuid' },
            unread_count: { type: 'integer' },
            last_message_at: { type: 'string', format: 'date-time' },
            last_message_preview: { type: 'string' }
          }
        },

        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            conversation_id: { type: 'string', format: 'uuid' },
            sender_name: { type: 'string' },
            message: { type: 'string' },
            is_client: { type: 'boolean' },
            is_read: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        Activity: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            activity_type: {
              type: 'string',
              enum: ['call', 'meeting', 'email', 'task', 'note']
            },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            contact_id: { type: 'string', format: 'uuid', nullable: true },
            project_id: { type: 'string', format: 'uuid', nullable: true },
            due_date: { type: 'string', format: 'date-time', nullable: true },
            completed: { type: 'boolean' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high']
            },
            created_at: { type: 'string', format: 'date-time' }
          }
        },

        // Pagination schemas
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        }
      }
    },
    security: [
      { BearerAuth: [] }
    ]
  }
};

/**
 * Swagger UI configuration
 */
export const swaggerUiConfig: FastifySwaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject) => swaggerObject,
  transformSpecificationClone: true
};

export default {
  swagger: swaggerConfig,
  swaggerUi: swaggerUiConfig
};
