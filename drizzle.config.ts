import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'
config({ path: '.env.local' })

export default defineConfig({
    // Database connectionw
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
