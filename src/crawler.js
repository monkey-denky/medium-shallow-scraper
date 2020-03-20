const cheerio = require('cheerio');
const { request } = require('./request');
const moment = require('moment');
const Promise = require('bluebird');
const { parseClaps } = require('./parser');
const { RateLimit } = require('async-sema');

function* Counter() {
  let counter = 1;
  while (true) {
    yield counter++;
  }
}

async function Crawler(url) {
  async function crawl(url) {
    let requestQueue = await getLinks(url);
    let data = [];
    let errors = [];
    const limit = new RateLimit(5);

    while (requestQueue.length > 0) {
      const promises = await Promise.map(requestQueue, async node => {
        try {
          if (node.isLeaf) {
            const { isLeaf, ...article } = node;
            //console.log(`[ARTICLE ${counter.next().value}]: ${node.link}`);
            data.push({ ...article });
          } else {
            await limit();
            return await getLinks(node.link);
          }
        } catch (error) {
          if (error.statusCode === 429) {
            console.log(`[ERROR 429 Too many requests]: ${node.link}`);
            requestQueue = [node, ...requestQueue];
          } else {
            console.log(`[ERROR ${error}]: ${node.link}`);
            errors.push({ link: node.link, error: error });
          }
        }
      });
      requestQueue = promises
        .filter(node => node)
        .flatMap(node => {
          return node;
        });
    }

    return { data, errors };
  }

  /* TODO create seperate actor for scrapping article
  //Information on article itself
  async function scrapeArticle(article) {
    const response = await request(article.link);
    console.log(
      `(${counter.next().value} articles) [OK ${response.statusCode}]: ${
        article.link
      }`,
    );
    const $ = cheerio.load(response.body);
    article.tags =
      $(`li a[href*="tag"]`)
        .map((index, tag) => $(tag).text())
        .get() || [];
    article.scrapped = true;
    return article;
  }
  */

  async function getLinks(url) {
    let requestQueue = [];
    try {
      const response = await request(url);
      console.log(`[OK ${response.statusCode}]: ${url}`);
      const $ = cheerio.load(response.body);
      const dates = $('.timebucket a');
      let currentIsDay = false;

      dates.each((index, element) => {
        if ($(element).attr('href') === url) {
          currentIsDay = true;
        }
      });

      //Is leaf?
      if (!dates.text() || currentIsDay) {
        requestQueue = $('.streamItem')
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
            obj.isLeaf = true;
            return obj;
          });
      } else {
        requestQueue = dates.get().map(date => {
          const link = $(date).attr('href');
          return { link, ifLeaf: false };
        });
      }
    } catch (error) {
      console.log(`[ERROR ${error}]: ${url}`);
    }

    return requestQueue;
  }

  let counter = Counter();
  const result = await crawl(url);
  return result;
}

exports.crawl = Crawler;
