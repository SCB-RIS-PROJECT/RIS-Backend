import { Scalar } from "@scalar/hono-api-reference";
import type { AppOpenAPI } from "@/interface";
import packageJSON from "../../package.json";

export default function configureOpenAPI(app: AppOpenAPI) {
    const title = "RIS (Radiology Information System) API Documentation";

    app.doc("/documentation", {
        openapi: "3.0.0",
        info: {
            title: title,
            version: packageJSON.version,
            description: packageJSON.description,
            contact: {
                name: packageJSON.author.name,
                url: packageJSON.author.url,
                email: packageJSON.author.email,
            },
            license: {
                name: "MIT",
                url: "https://github.com/haykal-fe-verd/ris-api/blob/main/license/mit/",
            },
        },
    });

    app.get(
        "/docs",
        Scalar({
            pageTitle: title,
            title,
            url: "/documentation",
            theme: "laserwave",
            layout: "classic",
            defaultHttpClient: {
                targetKey: "js",
                clientKey: "axios",
            },
        })
    );
}
