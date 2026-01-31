import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create the connection
const connectionString = process.env.DATABASE_URL!

//  Use postgres.js client
const client = postgres(connectionString, {
    prepare: false, // Required for connection pooling with Supabase
})

// Create Drizzle instance
export const db = drizzle(client, { schema })

// Export schema for direct use
export { schema }

// Export types
export type Database = typeof db
