# drizzle-auth-adaptor-pg

Drizzle orm adaptor for next-auth/authjs (postgres version)

```js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DrizzleAuthAdapterPG from "drizzle-authjs-adaptor-pg";
import { drizzle } from 'drizzle-orm/postgres-js';
import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export default NextAuth({
  adapter: DrizzleAuthAdapterPG(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
});
```