// Kiểm tra adapter Vercel mà không cần tài khoản: gọi handler với req/res giả.
import news from "../api/news.ts";

const call = (url: string) =>
  new Promise<{ status: number; type: string; items: number }>((resolve) => {
    let captured = { status: 0, headers: {} as Record<string, string> }, body = "";
    const res = {
      writeHead(status: number, headers: Record<string, string>) {
        captured = { status, headers };
        return res;
      },
      end(text: string) {
        body = text ?? "";
        const data = JSON.parse(body || "{}");
        resolve({ status: captured.status, type: captured.headers["content-type"], items: data.items?.length ?? 0 });
      },
    };
    news({ headers: { host: "example.vercel.app" }, url, method: "GET" } as never, res as never);
  });

console.log("news route:", await call("/functions/v1/app/news"));
console.log("second hit:", await call("/functions/v1/app/news"));
console.log("unknown:", await call("/functions/v1/app/nope"));
