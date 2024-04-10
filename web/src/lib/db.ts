/*

Debugging Supabase + Prisma

https://github.com/prisma/prisma/issues/11643

https://github.com/prisma/prisma/issues/22779

*/
// import { PrismaClient } from "@prisma/client";

// // Prevent multiple instances of Prisma Client in development
// declare global {
// 	// Check if it's not the type definition phase, and if not, then declare the global variable
// 	var prisma: PrismaClient | undefined;
// }

// let prisma: PrismaClient;

// if (process.env.NODE_ENV === "production") {
// 	prisma = new PrismaClient();
// } else {
// 	// Check if we're not in production and if the global Prisma instance is not already defined
// 	// This helps in reusing the same Prisma instance across hot-reloads in development.
// 	// console.log("globalThis.prisma BEFORE"); // FIXME:
// 	console.log(globalThis.prisma); // FIXME:
// 	if (!globalThis.prisma) {
// 		console.log("INSTANTIATING PRISMA CLIENT"); // FIXME:
// 		globalThis.prisma = new PrismaClient();
// 	}
// 	prisma = globalThis.prisma;
// 	// console.log("globalThis.prisma AFTER"); // FIXME:
// 	// console.log(globalThis.prisma); // FIXME:
// }

// export default prisma;

import { PrismaClient } from "@prisma/client";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
