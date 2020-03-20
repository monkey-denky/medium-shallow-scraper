const request = require('request-promise');

async function sendRequest(url) {
  const response = await request({
    url: url,
    resolveWithFullResponse: true,
    headers: {
      Connection: 'keep-alive',
    },
  });
  return response;
}

exports.request = sendRequest;
