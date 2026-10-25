import { auth } from "./auth.swagger.js";
import { user } from "./user.swagger.js";

export const swaggerDocument = {
    openapi: "3.0.4",
    info: {
        title: "Sample API",
        description: "Optional multiline or single-line description in [CommonMark](http://commonmark.org/help/) or HTML.",
        version: "0.1.9",
    },
    servers: [
        {
            url: "http://localhost:3069/api",
            description: "Optional server description, e.g. Main (production) server",
        },
        {
            url: "http://staging-api.example.com",
            description: "Optional server description, e.g. Internal staging server for testing",
        },
    ],
    paths: {
        ...auth,
        ...user,
    },
};

export default swaggerDocument;
