'use strict';

const handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      name: 'Demiban Diaz Torres'
    }),
    headers: {
      'X-Custom-Header': 'ASDF'
    }
  };
};

module.exports = {
  handler
};
