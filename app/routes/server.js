import { createRequestHandler } from "@remix-run/vercel";

export default createRequestHandler({
  build: () => import("./build/server/index.js"),
});
