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

    if (response.request.uri.href === url) {
      console.log('Crawling: ' + url);
      const { errors, data, visitedPages } = await crawl(url);
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      const end = moment();

      const stats = {
        totalArticles: data.length,
        totalSeconds: end.diff(start, 'seconds'),
        totalMegabytes: Math.round(used * 100) / 100,
      };

      console.dir(stats);
      // Save output
      const output = {
        input,
        stats,
        errors,
        data,
      };

      await Apify.setValue(input.keyphrase.replace(' ', '_'), output);
    } else {
      console.log('No artciles in:' + url);
    }
  } catch (error) {
    console.error(error);
  }
});
