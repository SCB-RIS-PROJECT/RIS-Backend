import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import env from "@/config/env";

const app = createApp();
configureOpenAPI(app);

// route

export default {
    port: env.PORT,
    fetch: app.fetch,
};
