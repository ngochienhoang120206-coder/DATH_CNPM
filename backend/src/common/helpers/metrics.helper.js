import client from "prom-client";

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

export const httpRequestCounter = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status"],
});

export const metricsEndpoint = async (req, res) => {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
};
