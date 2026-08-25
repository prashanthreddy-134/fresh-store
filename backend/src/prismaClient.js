import { PrismaClient } from "@prisma/client";

// A single shared Prisma instance — this IS the "one shared backend/database"
// that every interface (user app, user website, admin app, admin website) talks to.
export const prisma = new PrismaClient();
