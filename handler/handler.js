'use strict'

const handler = (payload, context, callback) => {
    console.log(`Function apiHandler called with payload ${JSON.stringify(payload)}`);
    callback(null, {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Hello from Lambda!'
        }),
        headers: {
            'X-Custom-Header': 'ASDF'
        }
    });
}

module.exports = {
    handler,
}
