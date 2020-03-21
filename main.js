// This is the main Node.js source code file of your actor.
// It is referenced from the "scripts" section of the package.json file,
// so that it can be started by running "npm start".

const Apify = require('apify');

const { parseUrl, parseClaps } = require('./src/parser.js');

const moment = require('moment');

/*
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
      const dataset = await Apify.openDataset();
      let stats = await crawl(url, dataset);
      const end = moment();
      stats.input = input;
      stats.totalSeconds = end.diff(start, 'seconds');
      await Apify.setValue('STATS', stats);
      console.log('[DONE]');
    } else {
      console.log('No artciles in: ' + url);
    }
  } catch (error) {
    console.error(error);
  }
});
*/

Apify.main(async () => {
  const input = await Apify.getInput();
  console.log('Input:');
  console.dir(input);
  if (!input || !input.keyphrase) {
    throw new Error(
      'Invalid input, must be a JSON object with the "keyphrase" field!',
    );
  }

  const url = parseUrl(input);
  const requestQueue = await Apify.openRequestQueue();

  await requestQueue.addRequest({
    url,
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    // The crawler downloads and processes the web pages in parallel, with a concurrency
    // automatically managed based on the available system memory and CPU (see AutoscaledPool class).
    // Here we define some hard limits for the concurrency.
    minConcurrency: 5,
    maxRequestRetries: 50,

    // Increase the timeout for processing of each page.
    handlePageTimeoutSecs: 60,

    // This function is called if the page processing failed more than maxRequestRetries+1 times.
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`[ERROR] ${request.url} `);
    },
    handlePageFunction: async ({ request, response, body, contentType, $ }) => {
      const finalHref = response.request.gotOptions.href;

      const requestPath = request.url.slice(
        request.url.lastIndexOf('/archive') + 8,
        request.url.lenght,
      );
      const finalPath = finalHref.slice(
        finalHref.lastIndexOf('/archive') + 8,
        finalHref.lenght,
      );

      if (requestPath === finalPath) {
        console.log(`[OK] ${request.url} `);
        let data;
        const dates = $('.timebucket a');
        let currentIsDay = false;

        dates.each((index, element) => {
          if ($(element).attr('href') === request.url) {
            currentIsDay = true;
          }
        });

        //Is leaf?
        if (!dates.text() || currentIsDay) {
          data = $('.streamItem')
            .get()
            .map(listItem => {
              const link = $(listItem).find(`a[data-action="open-post"]`);
              const responses = $(listItem).find(`a[href*="#--responses"]`);
              const author = $(listItem).find('a[data-user-id]');
              const name = $(listItem).find('h3');
              const claps = $(listItem).find(
                `button[data-action="show-recommends"]`,
              );
              const date = $(listItem).find(`time`);

              const obj = {};

              if (link) obj.link = link.attr('href').split('?')[0];

              if (author)
                obj.author = {
                  link: author.attr('href').split('?')[0],
                  name: author.text().trim(),
                };
              if (name) obj.name = name.text().trim();
              if (claps)
                obj.claps = parseInt(parseClaps(claps.text().trim())) || 0;
              if (responses)
                obj.responses =
                  parseInt(
                    responses
                      .text()
                      .trim()
                      .split(' ')[0],
                  ) || 0;
              if (date) {
                obj.date = moment(date.attr('datetime'));
              }

              return obj;
            });
        } else {
          await Apify.utils.enqueueLinks({
            $: $,
            requestQueue,
            selector: '.timebucket a',
          });
        }
        // Save the data to dataset.
        if (data) {
          await Apify.pushData({
            url: finalHref,
            data,
          });
        }
      } else {
        console.log('No artciles in: ' + finalHref);
      }
    },
  });

  const start = moment();
  await crawler.run();
  const end = moment();
});
