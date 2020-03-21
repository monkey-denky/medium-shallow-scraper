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

Output is saved to key-value store as a json file with name keyphrase_year_month_day.json.

### input

Input given by the user.

### stats

Information about the actor run.

### errors

Array of errors that were not solved during the actor run.

### data

Array of articles with wanted information.

### Example output

```json
{
  "input": { "keyphrase": "next js", "day": 14, "month": 3, "year": 2020 },
  "stats": {
    "totalCrawledPages": 420,
    "totalFoundArticles": 621,
    "totalUnfixedErrors": 0,
    "totalSeconds": 93
  },
  "errors": [
    {
      "link": "https://medium.com/the-ideal-system/graphql-and-mongodb-a-quick-example-34643e637e49",
      "error": "404 Page not found"
    }
  ],
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
```
