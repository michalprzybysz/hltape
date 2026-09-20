// apps/api/src/lib/database.ts
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "../db/index";

export default drizzleAdapter(db, {
  provider: "pg",
  schema,
});
