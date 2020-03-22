const Apify = require('apify');

const { parseUrl } = require('./src/parser.js');
const { scrapePage, archiveExists } = require('./src/crawler.js');

Apify.main(async () => {
  const stats = {
    totalArticleCount: 0,
    totalPageCount: 0,
    totalUnfixedErrors: 0,
    errors: [],
  };
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

    maxConcurrency: 50,

    handlePageTimeoutSecs: 60,

    handleFailedRequestFunction: async ({ request, error }) => {
      stats.errors.push(request);
      stats.totalUnfixedErrors++;
    },
    handlePageFunction: async ({ request, response, $ }) => {
      const finalUrl = response.request.gotOptions.href;
      stats.totalPageCount++;
      if (archiveExists(request.url, finalUrl)) {
        console.log(`${response.statusCode} ${request.url} `);

        const dates = $('.timebucket a');
        const currentIsDay = dates
          .get()
          .find(element => $(element).attr('href') === request.url);

        //Is leaf?
        if (!dates.text() || currentIsDay) {
          const data = scrapePage($);
          stats.totalArticleCount += data.length;
          await Apify.pushData({
            url: finalUrl,
            total: data.length,
            data,
          });
        } else {
          await Apify.utils.enqueueLinks({
            $: $,
            requestQueue,
            selector: '.timebucket a',
          });
        }
      } else {
        console.log('[DONE] No artciles in: ' + request.url);
      }
    },
  });

  await crawler.run();
  console.log(stats);
  await Apify.setValue('STATS', stats);
});
