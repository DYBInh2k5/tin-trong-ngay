// Kiểm tra adapter Vercel mà không cần tài khoản: gọi handler với req/res giả.
import news from "../api/news.mjs";

const call = (url) =>
  new Promise((resolve) => {
    let captured = { status: 0, headers: {} };
    const res = {
      writeHead(status, headers) {
        captured = { status, headers };
        return res;
      },
      end(body) {
        const data = JSON.parse(body || "{}");
        resolve({ status: captured.status, type: captured.headers["content-type"], items: data.items?.length ?? 0 });
      },
    };
    news({ headers: { host: "example.vercel.app" }, url, method: "GET" }, res);
  });

console.log("news route:", await call("/functions/v1/app/news"));
console.log("second hit:", await call("/functions/v1/app/news"));
console.log("unknown:", await call("/functions/v1/app/nope"));
