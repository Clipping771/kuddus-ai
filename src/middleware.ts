import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes are protected
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)", 
  "/api/chat(.*)",
  "/api/user(.*)"
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Protect dashboards and APIs, skip static/public assets
    "/((?!.+\\.[\\w]+$|_next).*)", 
    "/", 
    "/(api|trpc)(.*)"
  ],
};

