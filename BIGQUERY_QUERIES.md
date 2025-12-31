# BigQuery SQL Query Reference - Firebase Analytics (GA4)

This document contains ready-to-use SQL queries for Firebase Analytics data in BigQuery.

---

## 🎯 Table Structure

After enabling BigQuery export, you'll have these tables:

```
epic-electronics-274dd.analytics_XXXXX.events_YYYYMMDD
                                      ↑              ↑
                                  dataset ID    date partition
```

**Example:**
- `epic-electronics-274dd.analytics_123456789.events_20231231`
- `epic-electronics-274dd.analytics_123456789.events_*` (wildcard for all days)

---

## 📊 Core Metrics Queries

### 1. Total Users (Last 30 Days)

```sql
SELECT 
  COUNT(DISTINCT user_pseudo_id) as total_users
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
```

**Expected Output:**
| total_users |
|-------------|
| 4,523       |

---

### 2. Active Users (Last 24 Hours)

```sql
SELECT 
  COUNT(DISTINCT user_pseudo_id) as active_users_24h
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'user_engagement'
  AND TIMESTAMP_MICROS(event_timestamp) >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
```

---

### 3. Total Sessions

```sql
SELECT 
  COUNT(*) as total_sessions
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'session_start'
```

---

### 4. Page Views

```sql
SELECT 
  COUNT(*) as total_page_views
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'page_view'
```

---

### 5. Average Session Duration

```sql
SELECT 
  AVG(engagement_time_msec) / 1000 / 60 as avg_session_duration_minutes
FROM (
  SELECT
    user_pseudo_id,
    ga_session_id,
    SUM((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec')) as engagement_time_msec
  FROM 
    `epic-electronics-274dd.analytics_XXXXX.events_*`
  WHERE 
    _TABLE_SUFFIX BETWEEN 
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
      AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
    AND event_name = 'user_engagement'
  GROUP BY 
    user_pseudo_id, ga_session_id
)
```

---

### 6. Bounce Rate (GA4 Definition)

```sql
WITH session_engagement AS (
  SELECT
    CONCAT(user_pseudo_id, '-', (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id')) as session_id,
    MAX(CASE 
      WHEN (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec') >= 10000 
        OR event_name = 'purchase' 
      THEN 1 
      ELSE 0 
    END) as is_engaged
  FROM 
    `epic-electronics-274dd.analytics_XXXXX.events_*`
  WHERE 
    _TABLE_SUFFIX BETWEEN 
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
      AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  GROUP BY 
    session_id
)
SELECT
  ROUND((1 - AVG(is_engaged)) * 100, 2) as bounce_rate_percent
FROM 
  session_engagement
```

---

## 📄 Page-Level Metrics

### 7. Top Pages by Views

```sql
SELECT 
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') as page_url,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_title') as page_title,
  COUNT(*) as page_views,
  COUNT(DISTINCT user_pseudo_id) as unique_visitors
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'page_view'
GROUP BY 
  page_url, page_title
ORDER BY 
  page_views DESC
LIMIT 20
```

**Expected Output:**
| page_url | page_title | page_views | unique_visitors |
|----------|------------|------------|-----------------|
| /products | Products | 5,432 | 3,210 |
| / | Home | 4,123 | 2,890 |
| /cart | Cart | 1,234 | 890 |

---

### 8. Average Time on Page

```sql
SELECT 
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') as page_url,
  COUNT(*) as page_views,
  AVG((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec')) / 1000 as avg_time_seconds
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'user_engagement'
GROUP BY 
  page_url
ORDER BY 
  page_views DESC
LIMIT 20
```

---

## 🚦 Traffic Sources

### 9. Traffic Source Breakdown

```sql
SELECT 
  traffic_source.source as source,
  traffic_source.medium as medium,
  COUNT(DISTINCT user_pseudo_id) as users,
  COUNT(*) as sessions,
  ROUND(COUNT(DISTINCT user_pseudo_id) * 100.0 / SUM(COUNT(DISTINCT user_pseudo_id)) OVER(), 2) as percentage
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'session_start'
GROUP BY 
  source, medium
ORDER BY 
  users DESC
```

**Expected Output:**
| source | medium | users | sessions | percentage |
|--------|--------|-------|----------|------------|
| (direct) | (none) | 2,345 | 3,456 | 45.2% |
| google | organic | 1,234 | 1,890 | 23.8% |
| facebook.com | referral | 890 | 1,100 | 17.1% |

---

### 10. Campaign Performance

```sql
SELECT 
  traffic_source.source as source,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campaign') as campaign,
  COUNT(DISTINCT user_pseudo_id) as users,
  COUNT(*) as sessions,
  COUNTIF(event_name = 'purchase') as conversions,
  ROUND(COUNTIF(event_name = 'purchase') * 100.0 / COUNT(*), 2) as conversion_rate
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY 
  source, campaign
HAVING 
  campaign IS NOT NULL
ORDER BY 
  users DESC
```

---

## 📱 Device & Technology

### 11. Device Category Breakdown

```sql
SELECT 
  device.category as device_category,
  COUNT(DISTINCT user_pseudo_id) as users,
  ROUND(COUNT(DISTINCT user_pseudo_id) * 100.0 / SUM(COUNT(DISTINCT user_pseudo_id)) OVER(), 2) as percentage
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'session_start'
GROUP BY 
  device_category
ORDER BY 
  users DESC
```

**Expected Output:**
| device_category | users | percentage |
|-----------------|-------|------------|
| mobile | 3,240 | 62.4% |
| desktop | 1,567 | 30.2% |
| tablet | 385 | 7.4% |

---

### 12. Operating System Distribution

```sql
SELECT 
  device.operating_system as os,
  device.operating_system_version as os_version,
  COUNT(DISTINCT user_pseudo_id) as users,
  ROUND(COUNT(DISTINCT user_pseudo_id) * 100.0 / SUM(COUNT(DISTINCT user_pseudo_id)) OVER(), 2) as percentage
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'session_start'
GROUP BY 
  os, os_version
ORDER BY 
  users DESC
LIMIT 10
```

---

### 13. Browser Breakdown

```sql
SELECT 
  device.web_info.browser as browser,
  device.web_info.browser_version as version,
  COUNT(DISTINCT user_pseudo_id) as users,
  ROUND(COUNT(DISTINCT user_pseudo_id) * 100.0 / SUM(COUNT(DISTINCT user_pseudo_id)) OVER(), 2) as percentage
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'session_start'
GROUP BY 
  browser, version
ORDER BY 
  users DESC
LIMIT 10
```

---

## 🌍 Geographic Data

### 14. Traffic by Country

```sql
SELECT 
  geo.country as country,
  COUNT(DISTINCT user_pseudo_id) as users,
  COUNT(*) as sessions,
  ROUND(COUNT(DISTINCT user_pseudo_id) * 100.0 / SUM(COUNT(DISTINCT user_pseudo_id)) OVER(), 2) as percentage
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'session_start'
GROUP BY 
  country
ORDER BY 
  users DESC
LIMIT 20
```

---

### 15. Egypt Cities (Governorates)

```sql
SELECT 
  geo.city as city,
  geo.region as region,
  COUNT(DISTINCT user_pseudo_id) as users,
  COUNT(*) as sessions
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'session_start'
  AND geo.country = 'Egypt'
GROUP BY 
  city, region
ORDER BY 
  users DESC
```

---

## 📅 Time-Based Analytics

### 16. Daily Traffic (Last 30 Days)

```sql
SELECT 
  PARSE_DATE('%Y%m%d', event_date) as date,
  COUNT(DISTINCT user_pseudo_id) as users,
  COUNT(DISTINCT CONCAT(user_pseudo_id, '-', (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id'))) as sessions,
  COUNTIF(event_name = 'page_view') as page_views
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY 
  date
ORDER BY 
  date DESC
```

---

### 17. Hourly Traffic Pattern

```sql
SELECT 
  EXTRACT(HOUR FROM TIMESTAMP_MICROS(event_timestamp)) as hour,
  COUNT(DISTINCT user_pseudo_id) as users,
  COUNT(DISTINCT CONCAT(user_pseudo_id, '-', (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id'))) as sessions,
  COUNTIF(event_name = 'page_view') as page_views
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY 
  hour
ORDER BY 
  hour
```

---

## 🛒 E-commerce Metrics

### 18. Conversion Funnel

```sql
WITH funnel AS (
  SELECT
    user_pseudo_id,
    COUNTIF(event_name = 'page_view' AND (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') LIKE '%/products%') as viewed_products,
    COUNTIF(event_name = 'add_to_cart') as added_to_cart,
    COUNTIF(event_name = 'begin_checkout') as began_checkout,
    COUNTIF(event_name = 'purchase') as completed_purchase
  FROM 
    `epic-electronics-274dd.analytics_XXXXX.events_*`
  WHERE 
    _TABLE_SUFFIX BETWEEN 
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
      AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  GROUP BY 
    user_pseudo_id
)
SELECT
  'Total Users' as stage, COUNT(*) as users, 100.0 as conversion_rate FROM funnel
UNION ALL
  SELECT 'Viewed Products', COUNTIF(viewed_products > 0), ROUND(COUNTIF(viewed_products > 0) * 100.0 / COUNT(*), 2) FROM funnel
UNION ALL
  SELECT 'Added to Cart', COUNTIF(added_to_cart > 0), ROUND(COUNTIF(added_to_cart > 0) * 100.0 / COUNT(*), 2) FROM funnel
UNION ALL
  SELECT 'Began Checkout', COUNTIF(began_checkout > 0), ROUND(COUNTIF(began_checkout > 0) * 100.0 / COUNT(*), 2) FROM funnel
UNION ALL
  SELECT 'Completed Purchase', COUNTIF(completed_purchase > 0), ROUND(COUNTIF(completed_purchase > 0) * 100.0 / COUNT(*), 2) FROM funnel
```

---

## 🔄 Real-Time Queries

### 19. Active Users Right Now (Last 5 Minutes)

```sql
SELECT 
  COUNT(DISTINCT user_pseudo_id) as active_users_now
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_intraday_*`
WHERE 
  TIMESTAMP_MICROS(event_timestamp) >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
```

**Note:** Use `events_intraday_*` for real-time data (updated every few minutes).

---

### 20. Current Top Pages (Last 30 Minutes)

```sql
SELECT 
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') as page,
  COUNT(*) as views,
  COUNT(DISTINCT user_pseudo_id) as users
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_intraday_*`
WHERE 
  event_name = 'page_view'
  AND TIMESTAMP_MICROS(event_timestamp) >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 MINUTE)
GROUP BY 
  page
ORDER BY 
  views DESC
LIMIT 10
```

---

## 🎨 Advanced Queries

### 21. User Journey (Page Sequence)

```sql
WITH user_pages AS (
  SELECT
    user_pseudo_id,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') as session_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') as page,
    event_timestamp
  FROM 
    `epic-electronics-274dd.analytics_XXXXX.events_*`
  WHERE 
    _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
    AND event_name = 'page_view'
)
SELECT
  user_pseudo_id,
  session_id,
  STRING_AGG(page, ' → ' ORDER BY event_timestamp) as journey,
  COUNT(*) as pages_visited
FROM 
  user_pages
GROUP BY 
  user_pseudo_id, session_id
ORDER BY 
  pages_visited DESC
LIMIT 20
```

---

### 22. Cohort Analysis (User Retention)

```sql
WITH first_visit AS (
  SELECT
    user_pseudo_id,
    MIN(event_date) as cohort_date
  FROM 
    `epic-electronics-274dd.analytics_XXXXX.events_*`
  WHERE 
    _TABLE_SUFFIX BETWEEN 
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY))
      AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  GROUP BY 
    user_pseudo_id
),
user_activity AS (
  SELECT
    e.user_pseudo_id,
    fv.cohort_date,
    e.event_date,
    DATE_DIFF(PARSE_DATE('%Y%m%d', e.event_date), PARSE_DATE('%Y%m%d', fv.cohort_date), DAY) as days_since_first
  FROM 
    `epic-electronics-274dd.analytics_XXXXX.events_*` e
  INNER JOIN 
    first_visit fv ON e.user_pseudo_id = fv.user_pseudo_id
  WHERE 
    _TABLE_SUFFIX BETWEEN 
      FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY))
      AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
)
SELECT
  cohort_date,
  COUNT(DISTINCT CASE WHEN days_since_first = 0 THEN user_pseudo_id END) as day_0,
  COUNT(DISTINCT CASE WHEN days_since_first = 1 THEN user_pseudo_id END) as day_1,
  COUNT(DISTINCT CASE WHEN days_since_first = 7 THEN user_pseudo_id END) as day_7,
  COUNT(DISTINCT CASE WHEN days_since_first = 14 THEN user_pseudo_id END) as day_14,
  COUNT(DISTINCT CASE WHEN days_since_first = 30 THEN user_pseudo_id END) as day_30
FROM 
  user_activity
GROUP BY 
  cohort_date
ORDER BY 
  cohort_date DESC
LIMIT 10
```

---

## 💾 Optimized Query Template

Use this template for all your queries to optimize cost and performance:

```sql
/* 
  Query: [Description]
  Date Range: Last X days
  Estimated Bytes: ~XXX MB
  Cost: ~$0.00X
*/

-- Use specific date range (not SELECT *)
-- Use _TABLE_SUFFIX for partitioning
-- Limit results when possible

SELECT 
  -- Only select needed columns
  column1,
  column2
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  -- Always filter by date partition first
  _TABLE_SUFFIX BETWEEN 
    FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  -- Then other filters
  AND event_name = 'page_view'
GROUP BY 
  column1, column2
ORDER BY 
  column1 DESC
LIMIT 100  -- Always limit if possible
```

---

## 🔧 Common Functions

### Extract Event Parameter

```sql
-- String parameter
(SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location')

-- Integer parameter
(SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec')

-- Float parameter
(SELECT value.float_value FROM UNNEST(event_params) WHERE key = 'value')
```

### Session ID

```sql
CONCAT(
  user_pseudo_id, 
  '-', 
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id')
)
```

### Convert Timestamp

```sql
-- event_timestamp is in microseconds
TIMESTAMP_MICROS(event_timestamp)

-- Format as date
FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', TIMESTAMP_MICROS(event_timestamp))
```

---

## 📖 Next Steps

1. **Replace `XXXXX`** with your actual dataset ID from BigQuery console
2. **Test queries** in BigQuery console before using in production
3. **Monitor costs** in BigQuery billing dashboard
4. **Implement caching** for frequently-run queries
5. **Set up scheduled queries** for daily aggregations

---

**Tip:** Save commonly used queries as views in BigQuery:

```sql
CREATE OR REPLACE VIEW `epic-electronics-274dd.analytics_XXXXX.daily_metrics` AS
SELECT 
  PARSE_DATE('%Y%m%d', event_date) as date,
  COUNT(DISTINCT user_pseudo_id) as users,
  COUNTIF(event_name = 'page_view') as page_views
FROM 
  `epic-electronics-274dd.analytics_XXXXX.events_*`
WHERE 
  _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY))
GROUP BY 
  date
```

Then query the view instead of raw tables for better performance!

---

_Last Updated: 2025-12-31_
_Project: epic-electronics-274dd_
