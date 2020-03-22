const Apify = require('apify');
const moment = require('moment');
const { parseUrl } = require('./src/parser.js');
const {
  scrapePage,
  archiveExists,
  pageIsScrapable,
} = require('./src/crawler.js');

Apify.main(async () => {
  const stats = {
    articles: 0,
    pages: 0,
    errors: 0,
    fixedErrors: 0,
    remainingErrors: 0,
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

    maxConcurrency: 50,

    handlePageTimeoutSecs: 60,
    maybeRunIntervalSecs: 1,

    handleFailedRequestFunction: async ({ request, error }) => {
      const { url } = request;

      if (!errors[url]) {
        errors[url] = { count: 0 };
        stats.errors++;
      }
      errors[url].request = request;
      errors[url].count++;

      if (errors[url].count < 10) {
        console.log(`[ERROR] ${url} `);
        await requestQueue.addRequest({
          uniqueKey: `error_${errors[url].count}_${url}`,
          url,
        });
      } else {
        console.log(`[FAILED] ${url} `);
      }
    },
    prepareRequestFunction: async ({ request }) => {
      request.headers = { Accept: 'application/octet-stream' };
    },
    handlePageFunction: async ({ request, response, $ }) => {
      let { url } = request;
      const { uniqueKey } = request;
      const responseUrl = response.request.gotOptions.href;

      if (archiveExists(url, responseUrl)) {
        url = responseUrl;
        stats.pages++;
        const isFix = uniqueKey.startsWith('error_');
        if (isFix) {
          stats.fixedErrors++;
          delete errors[url];
        }
        const fixTag = isFix ? 'FIX ' : '';

        if (pageIsScrapable(url, $)) {
          console.log(`[${fixTag}SCRAPE] ${url} `);
          const data = scrapePage($);
          stats.articles += data.length;
          await Apify.pushData({
            url,
            total: data.length,
            data,
          });
        } else {
          console.log(`${fixTag}[CRAWL] ${url} `);

          await Apify.utils.enqueueLinks({
            $: $,
            requestQueue,
            selector: '.timebucket a',
          });
        }
      } else {
        console.log('[DONE] No artciles in: ' + url);
      }
    },
  });

  const start = moment();
  await crawler.run();
  const end = moment();
  stats.remainingErrors = Object.values(errors).length;
  stats.seconds = end.diff(start, 'seconds');
  console.log(stats);
  await Apify.setValue('STATS', stats);
  await Apify.setValue('ERRORS', errors);
  await requestQueue.drop();
});
