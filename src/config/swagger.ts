import fs from 'fs';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

// All API documentation lives in the /swagger-docs folder (one YAML file per module).
// In development it is read from the project root; in production builds it is
// copied next to the compiled code (dist/swagger-docs).
const candidates = [
  path.resolve(__dirname, '..', 'swagger-docs'),
  path.resolve(__dirname, '..', '..', 'swagger-docs'),
];
const docsDir = candidates.find((dir) => fs.existsSync(dir)) ?? candidates[1];

const spec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Real Estate Listing API',
      version: '1.0.0',
      description:
        'REST API for listing, searching and managing real estate properties.\n\n' +
        '**How to authenticate:** call `POST /auth/login` (or `/auth/register`), copy the `accessToken` ' +
        'from the response, click **Authorize** and paste it.',
    },
    servers: [{ url: `${env.API_URL}/api/v1`, description: env.NODE_ENV }],
  },
  // swagger-jsdoc uses glob patterns, which need forward slashes (also on Windows)
  apis: [path.join(docsDir, '*.yaml').split(path.sep).join('/')],
}) as { tags?: { name: string }[] };

// Show sections in a fixed order in Swagger UI (descriptions come from each module's YAML file).
const TAG_ORDER = ['Auth', 'Properties', 'Email Notifications'];
const rank = (name: string) => TAG_ORDER.indexOf(name) + 1 || TAG_ORDER.length + 1;

export const swaggerSpec = {
  ...spec,
  tags: [...(spec.tags ?? [])].sort((a, b) => rank(a.name) - rank(b.name)),
};
