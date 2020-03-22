const Apify = require('apify');
const moment = require('moment');
const { parseUrl } = require('./src/parser.js');
const {
  scrapePage,
  archiveExists,
  pageIsScrapable,
} = require('./src/crawler.js');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Apify.main(async () => {
  const stats = {
    articles: 0,
    pages: 0,
    errors: 0,
  };
  const errors = {};
  const input = await Apify.getInput();
  console.log('Input:');
  console.dir(input);
  if (!input || !input.keyphrase) {
    throw new Error(
      'Invalid input, must be a JSON object with the "keyphrase" field!',
    );
  }

  const startUrl = parseUrl(input);
  const requestQueue = await Apify.openRequestQueue();
  await requestQueue.addRequest({
    url: startUrl,
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    minConcurrency: 5,
    handlePageTimeoutSecs: 60,
    additionalMimeTypes: ['application/octet-stream'],

    handleFailedRequestFunction: async ({ request }) => {
      console.log(`[ERROR ${request.id}]: ${request.url}`);
      errors[request.url] = request;
    },

    handlePageFunction: async ({ request, response, autoscaledPool, $ }) => {
      let { url } = request;
      const { uniqueKey } = request;
      const responseUrl = response.request.gotOptions.href;
      try {
        if (archiveExists(url, responseUrl)) {
          url = responseUrl;
          stats.pages++;
          const isFix = request.retryCount > 0;
          const fixTag = isFix ? 'FIX ' : '';

          if (pageIsScrapable(url, $)) {
            console.log(`[${fixTag}SCRAPE] ${url}`);
            const data = scrapePage($);
            stats.articles += data.length;
            await Apify.pushData({
              url,
              total: data.length,
              data,
            });
          } else {
            console.log(`[${fixTag}CRAWL] ${url}`);

            await Apify.utils.enqueueLinks({
              $: $,
              requestQueue,
              selector: '.timebucket a',
            });
          }
        } else {
          console.log('[DONE] No artciles in: ' + url);
        }
      } catch (error) {
        autoscaledPool.desiredConcurrency--;
        throw new Error(`[ERROR: ${url}`);
      }
    },
  });

  const start = moment();
  await crawler.run();
  const end = moment();
  stats.errors = Object.values(errors).length;
  stats.seconds = end.diff(start, 'seconds');
  console.log(stats);
  await Apify.setValue('STATS', stats);
  await Apify.setValue('ERRORS', errors);
});
