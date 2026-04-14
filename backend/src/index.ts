import { createServer } from "http";
import { env } from "./config/env";
import { createApp } from "./app";
import { startCronJobs } from "./utils/cron";
import { initCrashSocket, crashService } from "./services/crash.service";

const app = createApp();
const httpServer = createServer(app);

initCrashSocket(httpServer);

httpServer.listen(env.PORT, () => {
  process.stdout.write(`Server running on port ${env.PORT}\n`);
  startCronJobs();
  crashService.startGameLoop();
});
