const next = require("next");
const http = require("http");

const port = parseInt(process.env.PORT || "3000", 10);

const app = next({
  dev: false,
  dir: "./apps/web",
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      handle(req, res);
    })
    .listen(port, "0.0.0.0", () => {
      console.log(`> Next.js server running on port ${port}`);
    });
});