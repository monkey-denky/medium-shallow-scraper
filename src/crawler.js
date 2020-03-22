const moment = require('moment');

const { parseClaps } = require('./parser');

function archiveExists(originalUrl, finalUrl) {
  const originalDate = originalUrl.slice(
    request.url.lastIndexOf('/archive') + 8,
    request.url.lenght,
  );
  const finalDate = finalUrl.slice(
    finalHref.lastIndexOf('/archive') + 8,
    finalHref.lenght,
  );
  return originalDate === finalDate;
}

function scrapePage($) {
  $('.streamItem')
    .get()
    .map(listItem => {
      const link = $(listItem).find(`a[data-action="open-post"]`);
      const responses = $(listItem).find(`a[href*="#--responses"]`);
      const author = $(listItem).find('a[data-user-id]');
      const name = $(listItem).find('h3');
      const claps = $(listItem).find(`button[data-action="show-recommends"]`);
      const date = $(listItem).find(`time`);

      const obj = {};

      if (link) obj.link = link.attr('href').split('?')[0];

      if (author)
        obj.author = {
          link: author.attr('href').split('?')[0],
          name: author.text().trim(),
        };
      if (name) obj.name = name.text().trim();
      if (claps) obj.claps = parseClaps(claps.text().trim()) || 0;
      if (responses) obj.responses = parseInt(responses.text()) || 0;
      if (date) {
        obj.date = moment(date.attr('datetime'));
      }

      return obj;
    });
}

exports.crawl = Crawler;
exports.archiveExists = archiveExists;
exports.scrapePage = scrapePage;
