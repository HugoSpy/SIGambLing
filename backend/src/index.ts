import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.PORT, () => {
  process.stdout.write(`Server running on port ${env.PORT}\n`);
});
