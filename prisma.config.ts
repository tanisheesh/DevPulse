import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // env() throws if DATABASE_URL is missing (breaks `prisma generate` on Vercel at build time).
    // process.env is safe: generate only reads the schema, not the DB.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/devpulse",
  },
});
