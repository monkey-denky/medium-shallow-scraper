const moment = require('moment');

function parseClaps(text) {
  if (!isNaN(text)) return text;
  return parseFloat(text) * 1000;
}

function parseDate(year, month, day) {
  const date = moment();
  let format = '';
  if (year) {
    // if (isNaN(year) || year > date.year() || year < 2000) {
    //   throw new Error(
    //     'Invalid input, year must be a number in interval <2000,current year>',
    //   );
    // }
    date.year(year);
    format = 'YYYY';
  }
  if (month) {
    const momentMonth = month - 1;
    // const input = date;
    // input.month(momentMonth);
    // if (isNaN(month) || current.isAfter(date) || month < 1) {
    //   throw new Error(
    //     'Invalid input, month must be a number in interval <1, current month>',
    //   );
    // }
    date.month(momentMonth);
    format = 'YYYY/MM';
  }
  if (day) {
    if (day > date.daysInMonth()) {
      throw new Error(
        `[INVALID INPUT] Given day input is ${day}. ${date.format(
          'MMMM YYYY',
        )} has only ${date.daysInMonth()} days.`,
      );
    }
    date.date(day);
    format = 'YYYY/MM/DD';
  }
  return date.format(format);
}

function parseUrl(input) {
  const { keyphrase, year, month, day } = input;
  let url = `https://medium.com/tag/${escape(keyphrase)}/archive`;
  if (year || month || day) {
    url += `/${parseDate(year, month, day)}`;
  }
  console.log(`Parsed url: ${url}`);
  return url;
}

exports.parseUrl = parseUrl;
exports.parseClaps = parseClaps;
