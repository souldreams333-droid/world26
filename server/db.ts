import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, conversations, messages } from "@shared/schema";

const client = postgres("postgresql://postgres:password@localhost:5433/postgres");
export const db = drizzle(client, { schema: { users, conversations, messages } });
