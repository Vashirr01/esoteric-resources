import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DATABASE_URL || "";
console.log("DATABASE_URL host:", dbUrl.replace(/\/\/.*@/, "//***@"));

const prisma = new PrismaClient({
  log: ["error"],
});

export default prisma;
