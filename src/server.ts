import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const start = async () => {
  try {
    await prisma.$connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on ${env.API_URL}`);
    console.log(`Swagger docs available at ${env.API_URL}/api-docs`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

void start();
