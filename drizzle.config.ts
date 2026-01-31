import { defineConfig } from 'drizzle-kit'

export default defineConfig({
    // Database connection
    // Use direct connection for schema introspection (not pooler)
    // For runtime queries, use DATABASE_URL (pooler)
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!,
    },

    // Schema configuration
    schema: './src/lib/db/schema.ts',
    out: './drizzle',

    // Introspection settings
    verbose: true,
    strict: true,
})
