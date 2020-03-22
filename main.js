// This is the main Node.js source code file of your actor.
// It is referenced from the "scripts" section of the package.json file,
// so that it can be started by running "npm start".

const Apify = require('apify');

const { parseUrl, parseClaps } = require('./src/parser.js');

const moment = require('moment');

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
  const errors = [];
  await requestQueue.addRequest({
    url,
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,

    maxConcurrency: 50,

    handlePageTimeoutSecs: 60,

    handleFailedRequestFunction: async ({ request }) => {
      console.log(`[FAILED] ${request.url} `);
      await requestQueue.addRequest({ url: request.url });
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
        console.log(`${response.statusCode} ${request.url} `);
        //console.log(`[OK] ${request.url} `);
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
        console.log('[DONE] No artciles in: ' + request.url);
      }
    },
  });

  await crawler.run();
});
