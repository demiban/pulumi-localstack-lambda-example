'use strict';

const handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      address: {
        line1: '787 LocalStack Ave.',
        line2: 'Pulumi, PR 00939'
      }
    }),
    headers: {
      'X-Custom-Header': 'ASDF'
    }
  };
};

module.exports = {
  handler
};
