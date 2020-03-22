const Apify = require('apify');

const { parseUrl } = require('./src/parser.js');
const { scrapePage, archiveExists } = require('./src/crawler.js');

Apify.main(async () => {
  const stats = {
    totalArticleCount: 0,
    totalPageCount: 0,
    totalUnfixedErrors: 0,
  };
  const errors = [];
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
      console.log(`[ERROR] ${request.url} `);
      errors.push(request);
      stats.totalUnfixedErrors++;
    },
    prepareRequestFunction: async ({ request }) => {
      request.headers = { Accept: 'application/octet-stream' };
    },
    handlePageFunction: async ({ request, response, $ }) => {
      const finalUrl = response.request.gotOptions.href;
      stats.totalPageCount++;
      if (archiveExists(request.url, finalUrl)) {
        const dates = $('.timebucket a');
        const currentIsDay = dates
          .get()
          .find(element => $(element).attr('href') === request.url);

        //Is leaf?
        if (!dates.text() || currentIsDay) {
          console.log(`[SCRAPE] ${request.url} `);
          const data = scrapePage($);
          stats.totalArticleCount += data.length;
          await Apify.pushData({
            url: finalUrl,
            total: data.length,
            data,
          });
        } else {
          console.log(`[CRAWL] ${request.url} `);
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
  console.dir(errors);
  console.log(stats);
  await Apify.setValue('STATS', stats);
  await Apify.setValue('ERRORS', errors);
});
