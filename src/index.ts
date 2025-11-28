import configureOpenAPI from "@/config/configure-open-api";
import createApp from "@/config/create-app";
import env from "@/config/env";
import authController from "@/controller/auth.controller";
import modalityController from "@/controller/modality.controller";
import patientController from "@/controller/patient.controller";
import practitionerController from "@/controller/practitioner.controller";
import satuSehatController from "@/controller/satu-sehat.controller";

const app = createApp();

configureOpenAPI(app);

// route
const routes = [
    authController,
    patientController,
    practitionerController,
    modalityController,
    satuSehatController,
] as const;

routes.forEach((route) => {
    app.route("/", route);
});

export type AppType = (typeof routes)[number];

export default {
    port: env.PORT,
    fetch: app.fetch,
};
