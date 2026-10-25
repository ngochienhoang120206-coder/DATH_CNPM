// có thể tham khảo thư viện morgan
export const logApi = (mode) => {
    return (req, res, next) => {
        const method = req.method;
        const url = req.originalUrl;
        const ip = req.ip;

        const messLogApi = `${new Date().toLocaleString()} \t ${method} \t ${url} \t ${ip} \t ${mode}`;

        console.log(messLogApi);

        next();
    };
};
