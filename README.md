# Medium shallow scrapper

Apify actor to scrape medium.com archive for given tag e.g. "react". Retrieves basic information for each found article (link, author, name, claps, responses, date).

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

Each article is continuously stored in dataset with name keyphrase_year_month_day. A single dataset file may looks like this:

```json
{
  "link": "https://medium.makegreatsoftware.com/chasing-a-constantly-changing-api-d7180776fd81",
  "author": {
    "link": "https://medium.makegreatsoftware.com/@michaelsheeley",
    "name": "Michael Sheeley"
  },
  "name": "",
  "claps": 0,
  "responses": 0,
  "date": "2007-11-17T00:00:00.000Z"
}
```

### Key-value store

At the end of the actor run object run stats if stored in a file named keyphrase_year_month_day.json in key-value store.
Errors attribute is and array of errors that were not solved during the actor run.

```json
{
  "input": { "keyphrase": "next js", "day": 14, "month": 3, "year": 2020 },
  "totalCrawledPages": 1844,
  "totalFoundArticles": 39190,
  "totalUnfixedErrors": 0,
  "errors": [],
  "totalSeconds": 457
}
```

## Logs

There are 3 main log statuses you will encounter: OK, ERROR, FIXED. All of these are followed with a link the status is meant for.

### [OK 200]

Request was correctly processed.

### [ERROR "some message"]

An error occured during processing the request and was added to request queue to retry.

### [FIXED]

Fixed an request that was marked as an error.

## TODO

### Concurrency

Currently the concurrency ceiling of an actor is set to 50.

I plan to add an option to customize the ceiling in the future.

### Retry on error

Currently if an error occures during visiting a page, actor will retry visiting the page 10 more times before marking the page as unsolvable case and adding it to errors which will appear in output file.

I plan to add an option to customize number of retries before marking the page as unsolvable in the future.

### Verbosity

Currenttly actor logs status of every request (OK, ERROR, FIXED).

I plan to add an option to customize displayed logs.
