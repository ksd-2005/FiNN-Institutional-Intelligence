import { defineConfig, loadEnv } from "vite";
import askHandler from "./api/ask.js";
import marketHandler from "./api/market.js";
import announcementsHandler from "./api/announcements.js";
import fundamentalsHandler from "./api/fundamentals.js";

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function localApiMiddleware(handler) {
  return async (req, res, next) => {
    try {
      req.query = Object.fromEntries(
        new URL(req.url, "http://localhost").searchParams.entries(),
      );
      if (req.method === "POST") req.body = await readJsonBody(req);
      let statusCode = 200;
      const response = {
        status(code) {
          statusCode = code;
          return response;
        },
        json(payload) {
          res.statusCode = statusCode;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(payload));
        },
      };
      await handler(req, response);
    } catch (error) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: error.message }));
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [
      {
        name: "finn-local-api",
        configureServer(server) {
          server.middlewares.use("/api/ask", localApiMiddleware(askHandler));
          server.middlewares.use(
            "/api/market",
            localApiMiddleware(marketHandler),
          );
          server.middlewares.use(
            "/api/announcements",
            localApiMiddleware(announcementsHandler),
          );
          server.middlewares.use(
            "/api/fundamentals",
            localApiMiddleware(fundamentalsHandler),
          );
        },
      },
    ],
  };
});
