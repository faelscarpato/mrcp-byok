import type { NextConfig } from "next";

/**
 * `distDir` is overridable so CI (or a sandbox that forbids deleting the
 * previous build) can compile into a fresh directory:
 *   NEXT_DIST_DIR=.next-ci npm run build
 *
 * `turbopack.root` pins the lockfile lookup to the project directory instead
 * of walking up to the user's home folder.
 */
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
