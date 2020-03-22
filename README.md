# Medium shallow scrapper

Apify actor to scrape medium.com archive for given tag e.g. "react". Retrieves basic information for each found article (link, author, name, claps, responses, date). This actor runs on Apify.CheerioCrawler

## !IMPORTANT!

This scrapper does not retrieve detailed information (e.g. tags, content) which is located on the article page itself. I will create an actor (medium-deep-scrapper) for scrapping information from particular medium article with a given url in the future.

The reason for this is to separate usecases that only requires basic article information (e.g. number of articles author wrote on given topic) from those, that require deep dive in the article (e.g. all tags of an article). This way the shallow scrapper can operate quickly by not visiting pages of every article.

## Input

If neither one of date fields (year, month , day) is specified, actor will scrape all articles for given tag.

### keyphrase (required)

Keyphrase (tag) you want to search for.

### year

Year you want to search the archive in. If any date field is specified except for year, then year field will default to current year.

### month

Month you want to search the archive in. If any date field is specified except for month, then month field will default to current month.

### day

Day you want to search the archive in. If any date field is specified except for day, then day field will default to current day. Day input automatically overflows to the next month if needed.

### Input examples

#### Search for articles tagged with "next js" from the beginning of time.

```json
{ "keyphrase": "next js" }
```

#### Search for articles tagged with "next js" published in 2019.

```json
{ "keyphrase": "next js", "year": 2019 }
```

#### Search for articles tagged with "next js" published in March of current year.

Lets say today is March 14, 2020 then inputs below are equivalent:

```json
{ "keyphrase": "next js", "month": 3 }
```

```json
{ "keyphrase": "next js", "year": 2020, "month": 3 }
```

#### Search for articles tagged with "next js" published on day 14th of current year and month.

Lets say today is March 14, 2020 then inputs below are equivalent:

```json
{ "keyphrase": "next js", "day": 14 }
```

```json
{ "keyphrase": "next js", "day": 14, "month": 3 }
```

```json
{ "keyphrase": "next js", "day": 14, "month": 3, "year": 2020 }
```

## Output

### Dataset

Array of objects containing:

- url: page from which articles were obtained
- total: number of articles
- data: array of articles.

```json
[
  {
    "url": "https://medium.com/tag/nextjs/archive/2016",
    "total": 1,
    "data": [
      {
        "link": "https://medium.com/the-ideal-system/graphql-and-mongodb-a-quick-example-34643e637e49",
        "author": {
          "link": "https://medium.com/@nmaro",
          "name": "Nick Redmark"
        },
        "name": "GraphQL and MongoDB — a quick example",
        "claps": 3600,
        "responses": 39,
        "date": "2016-12-12T16:01:43.941Z"
      }
    ]
  }
]
```

### Key-value store

Actor creates STATS.json and ERROR.json files.

#### ERRORS.json

Object where keys are urls where error occured and value is matching request object.

```json
{
  "https://medium.com/tag/react/archive/2018/01/27 ": {
    "errorMessage": "An errror occured"
  },
  "https://medium.com/tag/react/archive/2018/01/28 ": {
    "errorMessage": "Too many requests"
  }
}
```

#### STATS.json

Object containing actor run statistics.

```json
{ "articles": 622, "pages": 428, "errors": 0, "seconds": 50 }
```

## Logs

All of the following status tags are followed with a link the status is meant for.

### [CRAWL]

Retrieving links to visit

### [SCRAPE]

Retrieving articles information

### [ERROR]

An error occured during processing the request and was added to request queue to retry.

### [FAILURE]

An error occured more than twice on the same url and will not be added to request queue to retry.

### [FIX CRAWL/SCRAPE]

Request that an error occured on was processed correctly.

## TODO

### Deep scrapper

I plan to created a scrapper to get information for a given medium article url. This is to get more detailed information about article such as tags or the content itself.

### Verbosity

Currenttly actor logs status.

I plan to add an option to customize displayed logs.
