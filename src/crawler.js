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
    let errors = {};

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
            const links = await getLinks(node.link);
            const id = hash(node.link);
            if (errors[id]) {
              console.log(`[FIXED]: ${node.link}`);
              delete errors[id];
            }

            return links;
          }
        } catch (error) {
          console.log(`[ERROR ${error}]:${node.id} / ${node.link}`);

          const id = hash(node.link);

          if (errors[id]) {
            errors[id].count += 1;
          } else {
            errors[id] = { count: 1, link: node.link, error, solvable: true };
          }
          if (errors[id].count > 2) {
            errors[id].solvable = false;
          }
        }
      });

      requestQueue = [
        ...Object.values(errors)
          .filter(node => node.solvable)
          .map(node => node.data),
        ...promises
          .filter(node => node)
          .flatMap(node => {
            return node;
          }),
      ];
    }

    return {
      data,
      errors: Object.values(errors).map(error => {
        return { link: error.link, error: error.toString() };
      }),
      pageCount: counter.next().value - 1,
    };
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

    const response = await request(url);

    console.log(
      `(${counter.next().value} pages) [OK ${response.statusCode}]: ${url}`,
    );
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
          if (claps) obj.claps = parseInt(parseClaps(claps.text().trim())) || 0;
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
        return { id: hash(link), link, ifLeaf: false };
      });
    }

    return requestQueue;
  }

  let counter = Counter();
  const result = await crawl(url);
  return result;
}
function hash(text) {
  var hash = 0;
  if (text.length == 0) {
    return hash;
  }
  for (var i = 0; i < text.length; i++) {
    var char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

exports.crawl = Crawler;
