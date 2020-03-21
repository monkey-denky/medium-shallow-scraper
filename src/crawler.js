const cheerio = require('cheerio');
const { request } = require('./request');
const moment = require('moment');
const Promise = require('bluebird');
const { parseClaps } = require('./parser');

function* Counter() {
  let counter = 1;
  while (true) {
    yield counter++;
  }
}

function chunk(arr, size) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size),
  );
}

async function Crawler(url, dataset) {
  let errors = {};
  async function crawl(url) {
    let requestQueue = await getLinks({ link: url });

    while (requestQueue.length > 0) {
      const chunked = chunk(requestQueue, 50);
      let promises = [];
      for (let index = 0; index < chunked.length; index++) {
        const newPromises = await Promise.map(chunked[index], handleNode);
        promises = [...promises, ...newPromises];
      }

      requestQueue = [
        ...Object.values(errors)
          .filter(error => error.solvable)
          .map(error => error.node),
        ...promises
          .filter(node => node)
          .flatMap(node => {
            return node;
          }),
      ];
    }
    const info = await dataset.getInfo();
    const errorsArray = Object.values(errors).map(error => {
      return { link: error.node.link, error: error.message };
    });
    const stats = {
      totalCrawledPages: counter.next().value - 1,
      totalFoundArticles: info.itemCount,
      totalUnfixedErrors: errorsArray.length,
      errors: errorsArray,
    };
    return stats;
  }

  async function handleNode(node) {
    try {
      if (node.isLeaf) {
        const { isLeaf, ...article } = node;
        //console.log(`[ARTICLE ${counter.next().value}]: ${node.link}`);
        await dataset.pushData({ ...article });
      } else {
        const links = await getLinks(node);
        return links;
      }
    } catch (error) {
      console.log(`[ERROR ${error}]: ${node.link}`);
      const id = node.id;
      if (errors[id]) {
        errors[id].count += 1;
      } else {
        errors[id] = { count: 1, node, error, solvable: true };
      }
      if (errors[id].count > 10) {
        errors[id].solvable = false;
      }
    }
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
  async function getLinks(node) {
    const url = node.link;
    let requestQueue = [];

    const response = await request(url);
    if (errors[node.id]) {
      console.log(`${counter.next().value} pages) [FIXED]: ${url}`);
      delete errors[node.id];
    } else {
      console.log(
        `(${counter.next().value} pages) [OK ${response.statusCode}]: ${url}`,
      );
    }

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
