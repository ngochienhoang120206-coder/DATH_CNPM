/**
 * gửi 1 file
 * https://swagger.io/docs/specification/v3_0/describing-request-body/file-upload/#upload-via-multipart-requests
 * 
 * gửi nhiều file
 * https://swagger.io/docs/specification/v3_0/describing-request-body/file-upload/#multiple-file-upload
 */

export const user = {
    "/user/avatar-local": {
        post: {
            tags: ["User"],
            summary: "Upload avatar for user",
            description: "Optional extended description in CommonMark or HTML.",
            requestBody: {
                content: {
                    "multipart/form-data": {
                        schema: {
                            type: "object",
                            properties: {
                                orderId: {
                                    type: "integer",
                                },
                                userId: {
                                    type: "integer",
                                },
                                avatar: {
                                    type: "string",
                                    format: "binary",
                                },
                                filenames: {
                                    type: "array",
                                    items: {
                                        type: "string",
                                        format: "binary",
                                    },
                                },
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "ok",
                },
            },
        },
    },
};
