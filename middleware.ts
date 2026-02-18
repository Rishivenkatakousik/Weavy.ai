import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/_next(.*)",
  "/images(.*)",
  "/favicon.ico",
  "/(.*)\\.(ico|png|jpg|jpeg|gif|avif|webp|svg)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});
