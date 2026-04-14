import { env } from "./config/env";
import { createApp } from "./app";
import { startCronJobs } from "./utils/cron";
import { crashService } from "./services/crash.service";

const app = createApp();

app.listen(env.PORT, () => {
  process.stdout.write(`Server running on port ${env.PORT}\n`);
  startCronJobs();
  crashService.startGameLoop();
});
