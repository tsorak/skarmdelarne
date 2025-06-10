import serve from "./http.ts";
import { buildClient } from "./dev.ts";

await main();

async function main() {
  console.clear();
  await buildClient();

  serve();
}
