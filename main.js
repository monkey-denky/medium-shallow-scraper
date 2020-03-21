// This is the main Node.js source code file of your actor.
// It is referenced from the "scripts" section of the package.json file,
// so that it can be started by running "npm start".

const Apify = require('apify');

const { parseUrl } = require('./src/parser.js');
const { crawl } = require('./src/crawler.js');
const { request } = require('./src/request.js');
const moment = require('moment');

Apify.main(async () => {
  // Get input of the actor.
  // If you'd like to have your input checked and generate a user interface
  // for it, add INPUT_SCHEMA.json file to your actor.
  // For more information, see https://apify.com/docs/actor/input-schema
  const input = await Apify.getInput();
  console.log('Input:');
  console.dir(input);

  if (!input || !input.keyphrase) {
    throw new Error(
      'Invalid input, must be a JSON object with the "keyphrase" field!',
    );
  }
  try {
    const start = moment();
    const url = parseUrl(input);
    const response = await request(url);
    const currentUrl = response.request.uri.href;
    const originalPath = url.slice(url.lastIndexOf('/archive') + 8, url.lenght);
    const currentPath = currentUrl.slice(
      currentUrl.lastIndexOf('/archive') + 8,
      currentUrl.lenght,
    );

    if (originalPath === currentPath) {
      console.log('Searching in: ' + currentUrl);
      // Open a named dataset

      const key = `${input.keyphrase.replace(/ /g, '-')}${
        currentPath ? currentPath.replace(/\//g, '-') : ''
      }`;
      const dataset = await Apify.openDataset(key);
      let stats = await crawl(url, dataset);
      const end = moment();
      stats.input = input;
      stats.totalSeconds = end.diff(start, 'seconds');
      const store = await Apify.openKeyValueStore(key);
      await store.setValue('STATS', stats);
      console.log('[DONE]');
    } else {
      console.log('No artciles in: ' + url);
    }
  } catch (error) {
    console.error(error);
  }
});
