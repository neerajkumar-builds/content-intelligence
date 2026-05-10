# Content Intelligence Agent -- n8n Workflow Designs

## Status: DESIGN PHASE (do not create yet) -- ALL 5 WORKFLOWS VALIDATED

### Validation Results
| Workflow | Valid | Nodes | Notes |
|---|---|---|---|
| 1. Signal Ingestion Pipeline | YES | 19 | Warnings on error-output expressions (expected for .onError() pattern) |
| 2. HubSpot Attribution Sync | YES | 9 | Warnings on error-output expressions (expected) |
| 3. Substack Paste Automation | YES | 7 | Clean -- no warnings |
| 4. Contract Test Runner | YES | 13 | Warnings on error-output expressions (expected) |
| 5. YouTube Long-Form Upload | YES | 11 | Warnings on error-output and convergence expressions (expected) |

---

## Platform Node Availability Audit

### Native n8n Nodes (use these -- direct API, built-in auth)

| Platform | Node ID | Operations |
|---|---|---|
| **YouTube** | `n8n-nodes-base.youTube` | video: upload, update, delete, get, getAll, rate; channel: get, update, uploadBanner; playlist: CRUD; playlistItem: CRUD |
| **X/Twitter** | `n8n-nodes-base.twitter` | tweet: create, delete, like, retweet, search; directMessage: create; list: add; user: searchUser |
| **LinkedIn** | `n8n-nodes-base.linkedIn` | post: create (text/image/article). No scraping -- use Phantombuster for that. |
| **Reddit** | `n8n-nodes-base.reddit` | post: create, delete, get, getAll, search; postComment: create, getAll, delete, reply; subreddit: get, getAll; user/profile: get |
| **Medium** | `n8n-nodes-base.medium` | post: create; publication: getAll |
| **WordPress** | `n8n-nodes-base.wordpress` | post: CRUD; page: CRUD; user: CRUD |
| **Ghost** | `n8n-nodes-base.ghost` | post: get, getAll, create, delete, update |
| **Slack** | `n8n-nodes-base.slack` | message: post, update, delete, search; channel: full CRUD; file: upload; reaction: add/get/remove |
| **Discord** | `n8n-nodes-base.discord` | message: send, get, getAll, delete, react; channel: CRUD; member: getAll, roleAdd/Remove |
| **Telegram** | `n8n-nodes-base.telegram` | message: send, edit, delete, pin, sendPhoto/Video/Audio/Document/Sticker/Animation/Location/MediaGroup |
| **Google Drive** | `n8n-nodes-base.googleDrive` | file: upload, download, copy, createFromText, move, share, update, delete; folder: create, delete, share; search |
| **HubSpot** | `n8n-nodes-base.hubspot` | contact: upsert/search/get/getAll/delete; company: CRUD + searchByDomain; deal: CRUD + search; engagement: CRUD; ticket: CRUD |
| **Facebook** | `n8n-nodes-base.facebookGraphApi` | Generic Graph API (any endpoint) |
| **RSS** | `n8n-nodes-base.rssFeedRead` | Read any RSS feed URL |
| **Supabase** | `n8n-nodes-base.supabase` | row: create, delete, get, getAll, update |

### No Native Node (use HTTP Request or Apify/Phantombuster)

| Platform | Approach |
|---|---|
| **Substack** | No API, no node. Use copy-paste via Google Drive + Slack notification. |
| **Instagram** | No dedicated node. Use Facebook Graph API node or HTTP Request with Instagram Graph API. |
| **TikTok** | No node. Use HTTP Request with TikTok Content Posting API. |
| **Pinterest** | No node. Use HTTP Request with Pinterest API v5. |
| **Buffer** | No node. Use HTTP Request. |
| **Hootsuite** | No node. Use HTTP Request. |
| **Dev.to** | No node. Use HTTP Request with Forem API. |
| **Hashnode** | No node. Use HTTP Request with Hashnode GraphQL API. |

---

## Workflow 1: Signal Ingestion Pipeline

**Purpose:** Every 30 minutes during business hours, fetch signals from RSS feeds, Reddit, and LinkedIn competitors, normalize them, and POST each to the Content Intelligence app webhook.

### Architecture Diagram
```
Schedule Trigger (30min, business hours)
    |
    +---> [Read RSS Feeds from Supabase] ---> [Loop: Fetch Each RSS Feed] ---> mergeSignals.input(0)
    |
    +---> [Reddit: Search Posts] ---> [Normalize Reddit] ---> mergeSignals.input(1)
    |
    +---> [Apify: LinkedIn Scrape] ---> [Normalize LinkedIn] ---> mergeSignals.input(2)
    |
mergeSignals (append)
    |
    +---> [Generate HMAC Signature] ---> [Loop: POST Each Signal to Webhook]
    |
    +---> onError ---> [Log Error to Webhook]
```

### SDK Code

```javascript
import { workflow, node, trigger, sticky, placeholder, newCredential, merge, splitInBatches, nextBatch, expr } from '@n8n/workflow-sdk';

// --- Sticky Notes ---
const overviewNote = sticky('## Signal Ingestion Pipeline\nFetches signals from RSS, Reddit, and LinkedIn every 30 min during business hours.\nNormalizes all signals into unified format and POSTs to Content Intelligence webhook with HMAC signature.', [], { color: 4, position: [200, 100], width: 500, height: 120 });

// --- Trigger ---
const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Every 30 Min (Business Hours)',
    parameters: {
      rule: {
        interval: [{
          field: 'cronExpression',
          expression: '0 */30 8-18 * * 1-5'
        }]
      }
    },
    position: [240, 400]
  },
  output: [{}]
});

// --- Branch 1: RSS Feeds ---
const fetchRssConfig = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Read RSS Feed Config',
    parameters: {
      resource: 'row',
      operation: 'getAll',
      tableId: placeholder('connectors table name (e.g. connectors)'),
      returnAll: true,
      filterType: 'manual',
      matchType: 'allFilters',
      filters: {
        conditions: [{
          keyName: 'platform',
          condition: 'eq',
          keyValue: 'rss'
        }, {
          keyName: 'health',
          condition: 'neq',
          keyValue: 'dead'
        }]
      }
    },
    credentials: { supabaseApi: newCredential('Supabase') },
    alwaysOutputData: true,
    position: [540, 300]
  },
  output: [{ id: 'conn-1', platform: 'rss', config: { feedUrl: 'https://example.com/feed.xml' }, health: 'healthy' }]
});

const rssBatchLoop = splitInBatches({
  version: 3,
  config: {
    name: 'Loop RSS Feeds',
    parameters: { batchSize: 1 },
    position: [780, 300]
  }
});

const fetchRssFeed = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: 'Fetch RSS Feed',
    parameters: {
      url: expr('{{ $json.config?.feedUrl ?? $json.config }}'),
      options: { ignoreSSL: false }
    },
    onError: 'continueErrorOutput',
    position: [1020, 400]
  },
  output: [{ title: 'New Blog Post', link: 'https://example.com/post', pubDate: '2026-05-11', content: 'Post content...' }]
});

const normalizeRss = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize RSS Signal',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'a1', name: 'source', value: 'rss', type: 'string' },
          { id: 'a2', name: 'title', value: expr('{{ $json.title }}'), type: 'string' },
          { id: 'a3', name: 'url', value: expr('{{ $json.link }}'), type: 'string' },
          { id: 'a4', name: 'content', value: expr('{{ $json.content ?? $json.contentSnippet ?? "" }}'), type: 'string' },
          { id: 'a5', name: 'publishedAt', value: expr('{{ $json.pubDate ?? $json.isoDate ?? $now.toISO() }}'), type: 'string' },
          { id: 'a6', name: 'metadata', value: expr('{{ { feedUrl: $json.feedUrl, creator: $json.creator ?? "" } }}'), type: 'object' },
          { id: 'a7', name: 'ingestedAt', value: expr('{{ $now.toISO() }}'), type: 'string' }
        ]
      }
    },
    position: [1260, 400]
  },
  output: [{ source: 'rss', title: 'New Blog Post', url: 'https://example.com/post', content: 'Post content...', publishedAt: '2026-05-11T10:00:00Z', metadata: {}, ingestedAt: '2026-05-11T10:30:00Z' }]
});

const rssErrorLog = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Log RSS Error',
    parameters: {
      method: 'POST',
      url: placeholder('Your error webhook URL (e.g. https://your-app.com/api/webhooks/n8n/errors)'),
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ { source: "rss-ingestion", error: $json.message ?? "RSS fetch failed", timestamp: $now.toISO() } }}')
    },
    position: [1260, 580]
  },
  output: [{ ok: true }]
});

// --- Branch 2: Reddit ---
const fetchReddit = node({
  type: 'n8n-nodes-base.reddit',
  version: 1,
  config: {
    name: 'Search Reddit Posts',
    parameters: {
      resource: 'post',
      operation: 'search',
      location: 'subreddit',
      subreddit: placeholder('Target subreddit (e.g. sales, revops, martech)'),
      keyword: placeholder('Search keyword'),
      returnAll: false,
      limit: 25,
      additionalFields: {
        sort: 'new'
      }
    },
    credentials: { redditOAuth2Api: newCredential('Reddit OAuth2') },
    executeOnce: true,
    position: [540, 600]
  },
  output: [{ title: 'Reddit Post Title', selftext: 'Content...', url: 'https://reddit.com/r/sales/...', author: 'user1', score: 42, created_utc: 1715400000, subreddit: 'sales', num_comments: 12 }]
});

const normalizeReddit = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize Reddit Signal',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'b1', name: 'source', value: 'reddit', type: 'string' },
          { id: 'b2', name: 'title', value: expr('{{ $json.title }}'), type: 'string' },
          { id: 'b3', name: 'url', value: expr('{{ "https://reddit.com" + $json.permalink }}'), type: 'string' },
          { id: 'b4', name: 'content', value: expr('{{ $json.selftext }}'), type: 'string' },
          { id: 'b5', name: 'publishedAt', value: expr('{{ DateTime.fromSeconds($json.created_utc).toISO() }}'), type: 'string' },
          { id: 'b6', name: 'metadata', value: expr('{{ { subreddit: $json.subreddit, author: $json.author, score: $json.score, numComments: $json.num_comments } }}'), type: 'object' },
          { id: 'b7', name: 'ingestedAt', value: expr('{{ $now.toISO() }}'), type: 'string' }
        ]
      }
    },
    position: [780, 600]
  },
  output: [{ source: 'reddit', title: 'Reddit Post Title', url: 'https://reddit.com/r/sales/...', content: 'Content...', publishedAt: '2026-05-11T10:00:00Z', metadata: {}, ingestedAt: '2026-05-11T10:30:00Z' }]
});

// --- Branch 3: LinkedIn via Apify ---
const fetchLinkedIn = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Apify: LinkedIn Competitor Posts',
    parameters: {
      method: 'POST',
      url: 'https://api.apify.com/v2/acts/curious_coder~linkedin-post-search-scraper/run-sync-get-dataset-items',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpQueryAuth',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ { "searchUrls": ["https://www.linkedin.com/search/results/content/?keywords=B2B%20content%20marketing"], "deepScrape": false, "maxItems": 20 } }}'),
      options: {
        timeout: 120000
      }
    },
    credentials: { httpQueryAuth: newCredential('Apify API Token') },
    executeOnce: true,
    onError: 'continueErrorOutput',
    position: [540, 900]
  },
  output: [{ text: 'LinkedIn post content', authorName: 'John Doe', authorUrl: 'https://linkedin.com/in/johndoe', likes: 100, comments: 20, reposts: 5, postedAt: '2026-05-10' }]
});

const normalizeLinkedIn = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize LinkedIn Signal',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'c1', name: 'source', value: 'linkedin', type: 'string' },
          { id: 'c2', name: 'title', value: expr('{{ ($json.text ?? "").substring(0, 100) + "..." }}'), type: 'string' },
          { id: 'c3', name: 'url', value: expr('{{ $json.url ?? $json.postUrl ?? "" }}'), type: 'string' },
          { id: 'c4', name: 'content', value: expr('{{ $json.text ?? "" }}'), type: 'string' },
          { id: 'c5', name: 'publishedAt', value: expr('{{ $json.postedAt ?? $now.toISO() }}'), type: 'string' },
          { id: 'c6', name: 'metadata', value: expr('{{ { author: $json.authorName, authorUrl: $json.authorUrl, likes: $json.likes ?? 0, comments: $json.comments ?? 0, reposts: $json.reposts ?? 0 } }}'), type: 'object' },
          { id: 'c7', name: 'ingestedAt', value: expr('{{ $now.toISO() }}'), type: 'string' }
        ]
      }
    },
    position: [780, 900]
  },
  output: [{ source: 'linkedin', title: 'LinkedIn post content...', url: '', content: 'LinkedIn post content', publishedAt: '2026-05-10', metadata: {}, ingestedAt: '2026-05-11T10:30:00Z' }]
});

const linkedInErrorLog = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Log LinkedIn Error',
    parameters: {
      method: 'POST',
      url: placeholder('Your error webhook URL'),
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ { source: "linkedin-ingestion", error: $json.message ?? "Apify scrape failed", timestamp: $now.toISO() } }}')
    },
    position: [780, 1080]
  },
  output: [{ ok: true }]
});

// --- Merge All Signals ---
const mergeSignals = merge({
  version: 3.2,
  config: {
    name: 'Merge All Signals',
    parameters: { mode: 'append', numberInputs: 3 },
    position: [1500, 600]
  }
});

// --- HMAC + POST Loop ---
const generateHmacAndPost = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Generate HMAC + POST Signal',
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: "const crypto = require('crypto');\n" +
        "const secret = $env.CONTENT_INTEL_WEBHOOK_SECRET || 'change-me';\n" +
        "const payload = JSON.stringify($json);\n" +
        "const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');\n" +
        "return {\n" +
        "  json: {\n" +
        "    ...$json,\n" +
        "    _hmacSignature: signature\n" +
        "  }\n" +
        "};"
    },
    position: [1740, 600]
  },
  output: [{ source: 'rss', title: 'Post', url: 'https://example.com', _hmacSignature: 'abc123' }]
});

const postSignalBatch = splitInBatches({
  version: 3,
  config: {
    name: 'Batch POST Signals',
    parameters: { batchSize: 5 },
    position: [1980, 600]
  }
});

const postSignalToWebhook = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'POST Signal to Content Intelligence',
    parameters: {
      method: 'POST',
      url: placeholder('Your app webhook URL (e.g. https://your-app.com/api/webhooks/n8n)'),
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'x-hmac-signature', value: expr('{{ $json._hmacSignature }}') },
          { name: 'x-signal-source', value: expr('{{ $json.source }}') }
        ]
      },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ $json }}'),
      options: {
        timeout: 30000,
        batching: { batch: { batchSize: 5, batchInterval: 1000 } }
      }
    },
    onError: 'continueErrorOutput',
    position: [2220, 700]
  },
  output: [{ success: true, signalId: 'sig-123' }]
});

const postErrorLog = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Log POST Error',
    parameters: {
      method: 'POST',
      url: placeholder('Your error webhook URL'),
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ { source: "signal-post", signal: $json.title, error: $json.message ?? "POST failed", timestamp: $now.toISO() } }}')
    },
    position: [2220, 900]
  },
  output: [{ ok: true }]
});

const waitBetweenBatches = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Rate Limit Pause',
    parameters: {
      resume: 'timeInterval',
      amount: 2,
      unit: 'seconds'
    },
    position: [2460, 700]
  },
  output: [{}]
});

// --- Compose Workflow ---
export default workflow('signal-ingestion', 'CI: Signal Ingestion Pipeline')
  .add(overviewNote)
  .add(scheduleTrigger)
  .to(fetchRssConfig.to(rssBatchLoop
    .onDone(mergeSignals.input(0))
    .onEachBatch(fetchRssFeed
      .onError(rssErrorLog)
      .to(normalizeRss.to(nextBatch(rssBatchLoop)))
    )
  ))
  .add(scheduleTrigger)
  .to(fetchReddit.to(normalizeReddit.to(mergeSignals.input(1))))
  .add(scheduleTrigger)
  .to(fetchLinkedIn
    .onError(linkedInErrorLog)
    .to(normalizeLinkedIn.to(mergeSignals.input(2))))
  .add(mergeSignals)
  .to(generateHmacAndPost)
  .to(postSignalBatch
    .onDone(sticky('Pipeline complete - all signals ingested', [], { color: 5, position: [2700, 500] }))
    .onEachBatch(postSignalToWebhook
      .onError(postErrorLog)
      .to(waitBetweenBatches.to(nextBatch(postSignalBatch)))
    )
  );
```

---

## Workflow 2: HubSpot Attribution Sync

**Purpose:** When a post is published (webhook event from the app), search HubSpot for matching contacts, create a marketing engagement for content attribution, and update the contact timeline.

### Architecture Diagram
```
Webhook (POST /hubspot-attribution)
    |
    +---> [Extract Event Data] ---> [Search HubSpot Contact] ---> [Check Contact Found?]
                                                                       |
                                                              True: [Create Engagement] ---> [Respond 200]
                                                              False: [Log No Match] ---> [Respond 200]
```

### SDK Code

```javascript
import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, expr } from '@n8n/workflow-sdk';

const overviewNote = sticky('## HubSpot Attribution Sync\nReceives post.published events, finds matching HubSpot contacts, creates content attribution engagements.', [], { color: 4, position: [200, 100], width: 500, height: 80 });

// --- Trigger ---
const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Receive Publish Event',
    parameters: {
      httpMethod: 'POST',
      path: 'hubspot-attribution',
      authentication: 'headerAuth',
      responseMode: 'responseNode'
    },
    credentials: { httpHeaderAuth: newCredential('Webhook Auth Header') },
    position: [240, 400]
  },
  output: [{
    body: {
      event: 'post.published',
      channel: 'linkedin',
      url: 'https://linkedin.com/posts/123',
      draft: { title: 'B2B Content Strategy', authorEmail: 'author@company.com', tags: ['sales', 'content'] },
      publishedAt: '2026-05-11T10:00:00Z'
    }
  }]
});

// --- Extract & Prepare ---
const extractEventData = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Extract Event Data',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'e1', name: 'channel', value: expr('{{ $json.body.channel }}'), type: 'string' },
          { id: 'e2', name: 'postUrl', value: expr('{{ $json.body.url }}'), type: 'string' },
          { id: 'e3', name: 'postTitle', value: expr('{{ $json.body.draft.title }}'), type: 'string' },
          { id: 'e4', name: 'authorEmail', value: expr('{{ $json.body.draft.authorEmail ?? "" }}'), type: 'string' },
          { id: 'e5', name: 'tags', value: expr('{{ $json.body.draft.tags ?? [] }}'), type: 'array' },
          { id: 'e6', name: 'publishedAt', value: expr('{{ $json.body.publishedAt }}'), type: 'string' }
        ]
      }
    },
    position: [540, 400]
  },
  output: [{ channel: 'linkedin', postUrl: 'https://linkedin.com/posts/123', postTitle: 'B2B Content Strategy', authorEmail: 'author@company.com', tags: ['sales', 'content'], publishedAt: '2026-05-11T10:00:00Z' }]
});

// --- HubSpot Search ---
const searchHubspotContact = node({
  type: 'n8n-nodes-base.hubspot',
  version: 2.2,
  config: {
    name: 'Search HubSpot Contact',
    parameters: {
      resource: 'contact',
      operation: 'search',
      authentication: 'appToken',
      returnAll: false,
      limit: 5,
      filterGroupsUi: {
        filterGroupsValues: [{
          filtersUi: {
            filterValues: [{
              propertyName: 'email',
              type: 'string',
              operator: 'EQ',
              value: expr('{{ $json.authorEmail }}')
            }]
          }
        }]
      },
      additionalFields: {
        properties: ['firstname', 'lastname', 'email', 'company', 'hs_object_id']
      }
    },
    credentials: { hubspotAppToken: newCredential('HubSpot App Token') },
    alwaysOutputData: true,
    onError: 'continueErrorOutput',
    position: [840, 400]
  },
  output: [{ id: '12345', properties: { firstname: 'John', lastname: 'Doe', email: 'author@company.com', company: 'Acme Corp' } }]
});

const hubspotSearchError = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Log HubSpot Search Error',
    parameters: {
      method: 'POST',
      url: placeholder('Your error webhook URL'),
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ { source: "hubspot-attribution", step: "search", error: $json.message ?? "Search failed", timestamp: $now.toISO() } }}')
    },
    position: [840, 600]
  },
  output: [{ ok: true }]
});

// --- Check Contact Found ---
const checkContactFound = ifElse({
  version: 2.2,
  config: {
    name: 'Contact Found?',
    parameters: {
      conditions: {
        combinator: 'and',
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{
          leftValue: expr('{{ $json.id }}'),
          rightValue: '',
          operator: { type: 'string', operation: 'isNotEmpty' }
        }]
      }
    },
    position: [1140, 400]
  }
});

// --- Create Engagement ---
const createEngagement = node({
  type: 'n8n-nodes-base.hubspot',
  version: 2.2,
  config: {
    name: 'Create Content Attribution',
    parameters: {
      resource: 'engagement',
      operation: 'create',
      authentication: 'appToken',
      type: 'task',
      metadata: {
        body: expr('{{ "Content published: " + $("Extract Event Data").item.json.postTitle + "\\nChannel: " + $("Extract Event Data").item.json.channel + "\\nURL: " + $("Extract Event Data").item.json.postUrl }}'),
        subject: expr('{{ "Content Attribution: " + $("Extract Event Data").item.json.postTitle }}'),
        status: 'COMPLETED',
        forObjectType: 'CONTACT'
      },
      additionalFields: {
        associations: {
          contactIds: expr('{{ $json.id }}')
        }
      }
    },
    credentials: { hubspotAppToken: newCredential('HubSpot App Token') },
    position: [1440, 300]
  },
  output: [{ engagement: { id: 67890, type: 'TASK', active: true } }]
});

// --- Log No Match ---
const logNoMatch = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Log No Contact Match',
    parameters: {
      method: 'POST',
      url: placeholder('Your error/audit webhook URL'),
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ { source: "hubspot-attribution", message: "No HubSpot contact found", email: $("Extract Event Data").item.json.authorEmail, postTitle: $("Extract Event Data").item.json.postTitle, timestamp: $now.toISO() } }}')
    },
    position: [1440, 500]
  },
  output: [{ ok: true }]
});

// --- Respond ---
const respondSuccess = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond 200 OK',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ { success: true, message: "Attribution processed" } }}'),
      options: { responseCode: 200 }
    },
    position: [1740, 400]
  },
  output: [{}]
});

// --- Compose ---
export default workflow('hubspot-attribution', 'CI: HubSpot Attribution Sync')
  .add(overviewNote)
  .add(webhookTrigger)
  .to(extractEventData)
  .to(searchHubspotContact
    .onError(hubspotSearchError))
  .to(checkContactFound
    .onTrue(createEngagement.to(respondSuccess))
    .onFalse(logNoMatch.to(respondSuccess)));
```

---

## Workflow 3: Substack Paste Automation

**Purpose:** When a post is approved for Substack, convert the markdown content to a copy-paste-ready file, store it in Google Drive, and notify the operator via Slack with a direct link.

### Architecture Diagram
```
Webhook (POST /substack-paste)
    |
    +---> [Extract Content] ---> [Format for Substack] ---> [Create File in Google Drive]
          ---> [Send Slack Notification with Drive Link] ---> [Respond 200]
```

### SDK Code

```javascript
import { workflow, node, trigger, sticky, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

const overviewNote = sticky('## Substack Paste Automation\nReceives approved Substack drafts, creates a copy-paste-ready file in Google Drive, and notifies operator via Slack.\nSubstack has no API -- this is the manual-assist bridge.', [], { color: 4, position: [200, 100], width: 500, height: 100 });

// --- Trigger ---
const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Receive Substack Approval',
    parameters: {
      httpMethod: 'POST',
      path: 'substack-paste',
      authentication: 'headerAuth',
      responseMode: 'responseNode'
    },
    credentials: { httpHeaderAuth: newCredential('Webhook Auth Header') },
    position: [240, 400]
  },
  output: [{
    body: {
      event: 'post.approved',
      channel: 'substack',
      draft: {
        id: 'draft-123',
        title: 'Weekly GTM Insights',
        subtitle: 'Your weekly dose of go-to-market strategy',
        body: '# Weekly GTM Insights\n\nThis week we cover...',
        tags: ['gtm', 'strategy'],
        scheduledFor: '2026-05-12T09:00:00Z'
      }
    }
  }]
});

// --- Extract Content ---
const extractContent = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Extract Draft Content',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 's1', name: 'draftId', value: expr('{{ $json.body.draft.id }}'), type: 'string' },
          { id: 's2', name: 'title', value: expr('{{ $json.body.draft.title }}'), type: 'string' },
          { id: 's3', name: 'subtitle', value: expr('{{ $json.body.draft.subtitle ?? "" }}'), type: 'string' },
          { id: 's4', name: 'body', value: expr('{{ $json.body.draft.body }}'), type: 'string' },
          { id: 's5', name: 'tags', value: expr('{{ ($json.body.draft.tags ?? []).join(", ") }}'), type: 'string' },
          { id: 's6', name: 'scheduledFor', value: expr('{{ $json.body.draft.scheduledFor ?? "" }}'), type: 'string' }
        ]
      }
    },
    position: [540, 400]
  },
  output: [{ draftId: 'draft-123', title: 'Weekly GTM Insights', subtitle: 'Your weekly dose', body: '# Weekly GTM Insights...', tags: 'gtm, strategy', scheduledFor: '2026-05-12T09:00:00Z' }]
});

// --- Format for Substack ---
const formatForSubstack = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Format for Substack Copy-Paste',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "const item = $input.first().json;\n" +
        "const header = '---\\n' +\n" +
        "  'SUBSTACK POST - COPY & PASTE INSTRUCTIONS\\n' +\n" +
        "  '---\\n\\n' +\n" +
        "  'Title: ' + item.title + '\\n' +\n" +
        "  'Subtitle: ' + item.subtitle + '\\n' +\n" +
        "  'Tags: ' + item.tags + '\\n' +\n" +
        "  'Scheduled: ' + item.scheduledFor + '\\n' +\n" +
        "  'Draft ID: ' + item.draftId + '\\n\\n' +\n" +
        "  '--- COPY BELOW THIS LINE ---\\n\\n';\n" +
        "const formatted = header + item.body;\n" +
        "return [{ json: { ...item, formattedContent: formatted, fileName: 'substack-' + item.draftId + '-' + item.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50) + '.md' } }];"
    },
    position: [840, 400]
  },
  output: [{ draftId: 'draft-123', title: 'Weekly GTM Insights', formattedContent: '---\nSUBSTACK POST...', fileName: 'substack-draft-123-Weekly-GTM-Insights.md' }]
});

// --- Upload to Google Drive ---
const uploadToDrive = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Save to Google Drive',
    parameters: {
      resource: 'file',
      operation: 'createFromText',
      content: expr('{{ $json.formattedContent }}'),
      name: expr('{{ $json.fileName }}'),
      driveId: { __rl: true, mode: 'list', value: 'My Drive' },
      folderId: { __rl: true, mode: 'id', value: placeholder('Google Drive folder ID for Substack posts') }
    },
    credentials: { googleDriveOAuth2Api: newCredential('Google Drive OAuth2') },
    position: [1140, 400]
  },
  output: [{ id: 'gdrive-file-id-123' }]
});

// --- Slack Notification ---
const slackNotify = node({
  type: 'n8n-nodes-base.slack',
  version: 2.4,
  config: {
    name: 'Notify Operator on Slack',
    parameters: {
      resource: 'message',
      operation: 'post',
      authentication: 'oAuth2',
      select: 'channel',
      channelId: { __rl: true, mode: 'id', value: placeholder('Slack channel ID for content ops') },
      messageType: 'block',
      text: expr('{{ "Substack post ready: " + $("Extract Draft Content").item.json.title }}'),
      blocksUi: expr('{{ JSON.stringify({ "blocks": [{ "type": "header", "text": { "type": "plain_text", "text": "Substack Post Ready for Paste" } }, { "type": "section", "fields": [{ "type": "mrkdwn", "text": "*Title:*\\n" + $("Extract Draft Content").item.json.title }, { "type": "mrkdwn", "text": "*Scheduled:*\\n" + $("Extract Draft Content").item.json.scheduledFor }] }, { "type": "section", "text": { "type": "mrkdwn", "text": "*Google Drive Link:*\\n<https://drive.google.com/file/d/" + $json.id + "/view|Open copy-paste file>" } }, { "type": "context", "elements": [{ "type": "mrkdwn", "text": "Draft ID: " + $("Extract Draft Content").item.json.draftId + " | Tags: " + $("Extract Draft Content").item.json.tags }] }] }) }}')
    },
    credentials: { slackOAuth2Api: newCredential('Slack OAuth2') },
    position: [1440, 400]
  },
  output: [{ ok: true, message_timestamp: '1715400000.000001' }]
});

// --- Respond ---
const respondOk = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond 200',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ { success: true, driveFileId: $("Save to Google Drive").item.json.id, message: "Substack paste file created and operator notified" } }}'),
      options: { responseCode: 200 }
    },
    position: [1740, 400]
  },
  output: [{}]
});

// --- Compose ---
export default workflow('substack-paste', 'CI: Substack Paste Automation')
  .add(overviewNote)
  .add(webhookTrigger)
  .to(extractContent)
  .to(formatForSubstack)
  .to(uploadToDrive)
  .to(slackNotify)
  .to(respondOk);
```

---

## Workflow 4: Contract Test Runner

**Purpose:** Every hour, read all connectors from Supabase, run health probes, token expiry checks, and rate limit checks for each healthy/reconnect connector. POST results back and alert on failures.

### Architecture Diagram
```
Schedule Trigger (hourly)
    |
    +---> [Read Connectors from Supabase] ---> [Filter Healthy/Reconnect]
          ---> [Loop Each Connector] ---> [Health Probe HTTP] ---> [Set Test Results]
          ---> Done: [Aggregate Results] ---> [POST Results to Webhook]
                                          ---> [Check Any Failures?]
                                                    True: [Send Slack Alert]
                                                    False: (end)
```

### SDK Code

```javascript
import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, splitInBatches, nextBatch, expr } from '@n8n/workflow-sdk';

const overviewNote = sticky('## Contract Test Runner\nHourly health checks on all connectors. Tests: health probe, token expiry, rate limit headroom.\nAlerts via Slack on any failure.', [], { color: 4, position: [200, 100], width: 500, height: 80 });

// --- Trigger ---
const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Every Hour',
    parameters: {
      rule: {
        interval: [{
          field: 'hours',
          hoursInterval: 1,
          triggerAtMinute: 5
        }]
      }
    },
    position: [240, 400]
  },
  output: [{}]
});

// --- Read Connectors ---
const readConnectors = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Read All Connectors',
    parameters: {
      resource: 'row',
      operation: 'getAll',
      tableId: placeholder('connectors table name'),
      returnAll: true,
      filterType: 'none'
    },
    credentials: { supabaseApi: newCredential('Supabase') },
    alwaysOutputData: true,
    position: [540, 400]
  },
  output: [{ id: 'conn-1', platform: 'linkedin', health: 'healthy', config: { healthEndpoint: 'https://api.linkedin.com/v2/me', tokenExpiresAt: '2026-06-01T00:00:00Z' } }]
});

// --- Filter ---
const filterActive = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: {
    name: 'Filter Active Connectors',
    parameters: {
      conditions: {
        combinator: 'or',
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [
          { leftValue: expr('{{ $json.health }}'), rightValue: 'healthy', operator: { type: 'string', operation: 'equals' } },
          { leftValue: expr('{{ $json.health }}'), rightValue: 'reconnect', operator: { type: 'string', operation: 'equals' } }
        ]
      }
    },
    position: [780, 400]
  },
  output: [{ id: 'conn-1', platform: 'linkedin', health: 'healthy', config: { healthEndpoint: 'https://api.linkedin.com/v2/me' } }]
});

// --- Loop Connectors ---
const connectorLoop = splitInBatches({
  version: 3,
  config: {
    name: 'Test Each Connector',
    parameters: { batchSize: 1 },
    position: [1020, 400]
  }
});

// --- Health Probe ---
const healthProbe = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Health Probe',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.config?.healthEndpoint ?? "https://httpstat.us/200" }}'),
      options: {
        timeout: 10000,
        response: { response: { neverError: true, fullResponse: true } }
      }
    },
    onError: 'continueErrorOutput',
    position: [1260, 500]
  },
  output: [{ statusCode: 200, body: { ok: true } }]
});

// --- Build Test Result ---
const buildTestResult = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Test Result',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "const connector = $('Filter Active Connectors').first().json;\n" +
        "const probeResult = $input.first().json;\n" +
        "const statusCode = probeResult.statusCode ?? probeResult.headers?.['status'] ?? 0;\n" +
        "const healthOk = statusCode >= 200 && statusCode < 300;\n\n" +
        "// Token expiry check\n" +
        "const tokenExpiresAt = connector.config?.tokenExpiresAt;\n" +
        "let tokenOk = true;\n" +
        "let tokenDaysLeft = null;\n" +
        "if (tokenExpiresAt) {\n" +
        "  const expiry = new Date(tokenExpiresAt);\n" +
        "  tokenDaysLeft = Math.floor((expiry - new Date()) / (1000 * 60 * 60 * 24));\n" +
        "  tokenOk = tokenDaysLeft > 3;\n" +
        "}\n\n" +
        "// Rate limit check from headers\n" +
        "const rateLimitRemaining = parseInt(probeResult.headers?.['x-rate-limit-remaining'] ?? '999');\n" +
        "const rateLimitOk = rateLimitRemaining > 10;\n\n" +
        "const allPassed = healthOk && tokenOk && rateLimitOk;\n\n" +
        "return [{ json: {\n" +
        "  connectorId: connector.id,\n" +
        "  platform: connector.platform,\n" +
        "  healthProbe: { ok: healthOk, statusCode },\n" +
        "  tokenExpiry: { ok: tokenOk, daysLeft: tokenDaysLeft },\n" +
        "  rateLimit: { ok: rateLimitOk, remaining: rateLimitRemaining },\n" +
        "  allPassed,\n" +
        "  testedAt: new Date().toISOString()\n" +
        "} }];"
    },
    position: [1500, 500]
  },
  output: [{ connectorId: 'conn-1', platform: 'linkedin', healthProbe: { ok: true, statusCode: 200 }, tokenExpiry: { ok: true, daysLeft: 21 }, rateLimit: { ok: true, remaining: 500 }, allPassed: true, testedAt: '2026-05-11T10:05:00Z' }]
});

const probeErrorResult = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Record Probe Failure',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'f1', name: 'connectorId', value: expr('{{ $("Filter Active Connectors").item.json.id }}'), type: 'string' },
          { id: 'f2', name: 'platform', value: expr('{{ $("Filter Active Connectors").item.json.platform }}'), type: 'string' },
          { id: 'f3', name: 'healthProbe', value: expr('{{ { ok: false, error: $json.message ?? "Probe failed" } }}'), type: 'object' },
          { id: 'f4', name: 'tokenExpiry', value: expr('{{ { ok: false, error: "Could not check" } }}'), type: 'object' },
          { id: 'f5', name: 'rateLimit', value: expr('{{ { ok: false, error: "Could not check" } }}'), type: 'object' },
          { id: 'f6', name: 'allPassed', value: false, type: 'boolean' },
          { id: 'f7', name: 'testedAt', value: expr('{{ $now.toISO() }}'), type: 'string' }
        ]
      }
    },
    position: [1500, 700]
  },
  output: [{ connectorId: 'conn-1', platform: 'linkedin', allPassed: false, testedAt: '2026-05-11T10:05:00Z' }]
});

// --- After loop: Aggregate + POST + Alert ---
const postResults = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'POST Results to App',
    parameters: {
      method: 'POST',
      url: placeholder('Your contract-test results endpoint (e.g. https://your-app.com/api/webhooks/n8n/contract-tests)'),
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ { results: $input.all().map(i => i.json), runAt: $now.toISO() } }}')
    },
    executeOnce: true,
    position: [1260, 200]
  },
  output: [{ success: true }]
});

const checkFailures = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Check for Failures',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "const allResults = $input.all().map(i => i.json);\n" +
        "const failures = allResults.filter(r => !r.allPassed);\n" +
        "if (failures.length === 0) {\n" +
        "  return [{ json: { hasFailures: false, message: 'All connectors healthy' } }];\n" +
        "}\n" +
        "const summary = failures.map(f => {\n" +
        "  const issues = [];\n" +
        "  if (!f.healthProbe?.ok) issues.push('health probe failed');\n" +
        "  if (!f.tokenExpiry?.ok) issues.push('token expiring in ' + (f.tokenExpiry?.daysLeft ?? '?') + ' days');\n" +
        "  if (!f.rateLimit?.ok) issues.push('rate limit low: ' + (f.rateLimit?.remaining ?? '?') + ' remaining');\n" +
        "  return f.platform + ' (' + f.connectorId + '): ' + issues.join(', ');\n" +
        "}).join('\\n');\n" +
        "return [{ json: { hasFailures: true, failureCount: failures.length, summary } }];"
    },
    position: [1560, 200]
  },
  output: [{ hasFailures: true, failureCount: 1, summary: 'linkedin (conn-1): token expiring in 2 days' }]
});

const checkHasFailures = ifElse({
  version: 2.2,
  config: {
    name: 'Any Failures?',
    parameters: {
      conditions: {
        combinator: 'and',
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{
          leftValue: expr('{{ $json.hasFailures }}'),
          rightValue: true,
          operator: { type: 'boolean', operation: 'true' }
        }]
      }
    },
    position: [1860, 200]
  }
});

const slackAlert = node({
  type: 'n8n-nodes-base.slack',
  version: 2.4,
  config: {
    name: 'Alert: Connector Failures',
    parameters: {
      resource: 'message',
      operation: 'post',
      authentication: 'oAuth2',
      select: 'channel',
      channelId: { __rl: true, mode: 'id', value: placeholder('Slack alerting channel ID') },
      messageType: 'text',
      text: expr('{{ ":warning: *Contract Test Failures* (" + $json.failureCount + " connectors)\\n\\n" + $json.summary + "\\n\\nRun at: " + $now.toFormat("yyyy-MM-dd HH:mm") }}')
    },
    credentials: { slackOAuth2Api: newCredential('Slack OAuth2') },
    position: [2160, 100]
  },
  output: [{ ok: true }]
});

// --- Compose ---
export default workflow('contract-tests', 'CI: Contract Test Runner')
  .add(overviewNote)
  .add(scheduleTrigger)
  .to(readConnectors)
  .to(filterActive)
  .to(connectorLoop
    .onDone(postResults.to(checkFailures).to(checkHasFailures
      .onTrue(slackAlert)
      .onFalse(sticky('All connectors healthy', [], { color: 5, position: [2160, 300] }))
    ))
    .onEachBatch(healthProbe
      .onError(probeErrorResult.to(nextBatch(connectorLoop)))
      .to(buildTestResult.to(nextBatch(connectorLoop)))
    )
  );
```

---

## Workflow 5: YouTube Long-Form Upload

**Purpose:** When a video post is approved, download the video file, upload to YouTube with metadata (resumable upload), wait for processing, set a thumbnail, and report completion back to the app.

### Architecture Diagram
```
Webhook (POST /youtube-upload)
    |
    +---> [Extract Video Metadata] ---> [Download Video File]
          ---> [YouTube Upload] ---> [Wait for Processing]
          ---> [Set Thumbnail (HTTP)] ---> [POST Completion to App] ---> [Respond 200]
```

### SDK Code

```javascript
import { workflow, node, trigger, sticky, placeholder, newCredential, expr } from '@n8n/workflow-sdk';

const overviewNote = sticky('## YouTube Long-Form Upload\nReceives approved video posts, downloads video, uploads to YouTube with full metadata,\nsets thumbnail, and reports completion back to the Content Intelligence app.', [], { color: 4, position: [200, 100], width: 500, height: 100 });

// --- Trigger ---
const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Receive YouTube Upload Request',
    parameters: {
      httpMethod: 'POST',
      path: 'youtube-upload',
      authentication: 'headerAuth',
      responseMode: 'responseNode'
    },
    credentials: { httpHeaderAuth: newCredential('Webhook Auth Header') },
    position: [240, 400]
  },
  output: [{
    body: {
      event: 'post.approved',
      channel: 'youtube',
      draft: {
        id: 'draft-yt-001',
        title: 'B2B Content Strategy Masterclass',
        description: 'In this episode, we deep dive into...',
        tags: 'B2B,content strategy,marketing',
        categoryId: '22',
        privacyStatus: 'private',
        videoFileUrl: 'https://storage.example.com/videos/masterclass.mp4',
        thumbnailUrl: 'https://storage.example.com/thumbnails/masterclass.jpg'
      }
    }
  }]
});

// --- Extract Metadata ---
const extractMetadata = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Extract Video Metadata',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'y1', name: 'draftId', value: expr('{{ $json.body.draft.id }}'), type: 'string' },
          { id: 'y2', name: 'title', value: expr('{{ $json.body.draft.title }}'), type: 'string' },
          { id: 'y3', name: 'description', value: expr('{{ $json.body.draft.description }}'), type: 'string' },
          { id: 'y4', name: 'tags', value: expr('{{ $json.body.draft.tags ?? "" }}'), type: 'string' },
          { id: 'y5', name: 'categoryId', value: expr('{{ $json.body.draft.categoryId ?? "22" }}'), type: 'string' },
          { id: 'y6', name: 'privacyStatus', value: expr('{{ $json.body.draft.privacyStatus ?? "private" }}'), type: 'string' },
          { id: 'y7', name: 'videoFileUrl', value: expr('{{ $json.body.draft.videoFileUrl }}'), type: 'string' },
          { id: 'y8', name: 'thumbnailUrl', value: expr('{{ $json.body.draft.thumbnailUrl ?? "" }}'), type: 'string' }
        ]
      }
    },
    position: [540, 400]
  },
  output: [{ draftId: 'draft-yt-001', title: 'B2B Content Strategy Masterclass', description: 'In this episode...', tags: 'B2B,content strategy,marketing', categoryId: '22', privacyStatus: 'private', videoFileUrl: 'https://storage.example.com/videos/masterclass.mp4', thumbnailUrl: 'https://storage.example.com/thumbnails/masterclass.jpg' }]
});

// --- Download Video ---
const downloadVideo = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Download Video File',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.videoFileUrl }}'),
      options: {
        response: { response: { responseFormat: 'file', outputPropertyName: 'videoData' } },
        timeout: 600000
      }
    },
    position: [840, 400]
  },
  output: [{ draftId: 'draft-yt-001', title: 'B2B Content Strategy Masterclass' }]
});

// --- YouTube Upload ---
const youtubeUpload = node({
  type: 'n8n-nodes-base.youTube',
  version: 1,
  config: {
    name: 'Upload to YouTube',
    parameters: {
      resource: 'video',
      operation: 'upload',
      title: expr('{{ $("Extract Video Metadata").item.json.title }}'),
      regionCode: 'US',
      categoryId: expr('{{ $("Extract Video Metadata").item.json.categoryId }}'),
      binaryProperty: 'videoData',
      options: {
        description: expr('{{ $("Extract Video Metadata").item.json.description }}'),
        tags: expr('{{ $("Extract Video Metadata").item.json.tags }}'),
        privacyStatus: expr('{{ $("Extract Video Metadata").item.json.privacyStatus }}'),
        notifySubscribers: false
      }
    },
    credentials: { youTubeOAuth2Api: newCredential('YouTube OAuth2') },
    position: [1140, 400]
  },
  output: [{ uploadId: 'yt-video-id-123' }]
});

// --- Wait for Processing ---
const waitForProcessing = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Wait for YouTube Processing',
    parameters: {
      resume: 'timeInterval',
      amount: 60,
      unit: 'seconds'
    },
    position: [1440, 400]
  },
  output: [{}]
});

// --- Set Thumbnail via HTTP (YouTube API) ---
const setThumbnail = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Download Thumbnail',
    parameters: {
      method: 'GET',
      url: expr('{{ $("Extract Video Metadata").item.json.thumbnailUrl }}'),
      options: {
        response: { response: { responseFormat: 'file', outputPropertyName: 'thumbnailData' } },
        timeout: 30000
      }
    },
    position: [1740, 400]
  },
  output: [{}]
});

const uploadThumbnail = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Upload Thumbnail to YouTube',
    parameters: {
      method: 'POST',
      url: expr('{{ "https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=" + $("Upload to YouTube").item.json.uploadId }}'),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'youTubeOAuth2Api',
      sendBody: true,
      contentType: 'binaryData',
      inputDataFieldName: 'thumbnailData',
      options: {
        timeout: 30000
      }
    },
    credentials: { youTubeOAuth2Api: newCredential('YouTube OAuth2') },
    onError: 'continueErrorOutput',
    position: [2040, 400]
  },
  output: [{ kind: 'youtube#thumbnailSetResponse' }]
});

const thumbnailErrorLog = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Log Thumbnail Error (non-fatal)',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 't1', name: 'thumbnailError', value: expr('{{ $json.message ?? "Thumbnail upload failed" }}'), type: 'string' },
          { id: 't2', name: 'videoId', value: expr('{{ $("Upload to YouTube").item.json.uploadId }}'), type: 'string' }
        ]
      },
      includeOtherFields: true,
      include: 'all'
    },
    position: [2040, 600]
  },
  output: [{ thumbnailError: 'Thumbnail upload failed', videoId: 'yt-video-id-123' }]
});

// --- POST Completion ---
const postCompletion = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Report Upload Complete',
    parameters: {
      method: 'POST',
      url: placeholder('Your publish-complete endpoint (e.g. https://your-app.com/api/webhooks/n8n/publish-complete)'),
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ { event: "publish.complete", channel: "youtube", draftId: $("Extract Video Metadata").item.json.draftId, videoId: $("Upload to YouTube").item.json.uploadId, videoUrl: "https://youtube.com/watch?v=" + $("Upload to YouTube").item.json.uploadId, thumbnailSet: !$json.thumbnailError, completedAt: $now.toISO() } }}')
    },
    position: [2340, 400]
  },
  output: [{ success: true }]
});

// --- Respond ---
const respondOk = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond 200',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ { success: true, videoId: $("Upload to YouTube").item.json.uploadId, message: "YouTube upload complete" } }}'),
      options: { responseCode: 200 }
    },
    position: [2640, 400]
  },
  output: [{}]
});

// --- Compose ---
export default workflow('youtube-upload', 'CI: YouTube Long-Form Upload')
  .add(overviewNote)
  .add(webhookTrigger)
  .to(extractMetadata)
  .to(downloadVideo)
  .to(youtubeUpload)
  .to(waitForProcessing)
  .to(setThumbnail)
  .to(uploadThumbnail
    .onError(thumbnailErrorLog.to(postCompletion.to(respondOk))))
  .to(postCompletion)
  .to(respondOk);
```

---

## Implementation Checklist

### Pre-requisites (credentials to configure in n8n)
- [ ] **Supabase API** -- for reading connectors and feed configs
- [ ] **Reddit OAuth2** -- for Reddit post search
- [ ] **Apify API Token** -- as HTTP Query Auth for LinkedIn scraping
- [ ] **HubSpot App Token** -- for contact search and engagement creation
- [ ] **Google Drive OAuth2** -- for Substack file storage
- [ ] **Slack OAuth2** -- for notifications and alerts
- [ ] **YouTube OAuth2** -- for video upload and thumbnail
- [ ] **Webhook Auth Header** -- shared HMAC/token for inbound webhooks

### Environment Variables needed
- `CONTENT_INTEL_WEBHOOK_SECRET` -- HMAC secret for signal ingestion

### Deployment Order
1. **Workflow 4** (Contract Test Runner) -- standalone, no dependencies
2. **Workflow 1** (Signal Ingestion) -- core pipeline, test with single RSS feed
3. **Workflow 2** (HubSpot Attribution) -- needs the app running to send events
4. **Workflow 3** (Substack Paste) -- needs the app running to send events  
5. **Workflow 5** (YouTube Upload) -- most complex, needs video files ready

### n8n vs Direct API Decision Matrix for 15 Platforms

| Platform | n8n Node? | Recommendation | Reason |
|---|---|---|---|
| LinkedIn | Yes (post:create only) | **n8n node** for posting, **Apify/HTTP** for scraping | Native node handles OAuth2 for posts |
| Twitter/X | Yes (tweet:create) | **n8n node** | Full CRUD + search |
| YouTube | Yes (video:upload) | **n8n node** | Native resumable upload |
| Reddit | Yes (post:create, search) | **n8n node** | Full post + comment support |
| Medium | Yes (post:create) | **n8n node** | Simple but functional |
| WordPress | Yes (post:CRUD) | **n8n node** | Full CMS operations |
| Ghost | Yes (post:CRUD) | **n8n node** | Full CMS operations |
| Substack | No | **Manual paste via Google Drive + Slack** | No API exists |
| Instagram | Partial (Facebook Graph) | **HTTP Request** to Instagram Graph API | Better control with dedicated API |
| TikTok | No | **HTTP Request** to TikTok Content API | No node available |
| Pinterest | No | **HTTP Request** to Pinterest API v5 | No node available |
| Dev.to | No | **HTTP Request** to Forem API | Simple REST API |
| Hashnode | No | **HTTP Request** to GraphQL API | No node available |
| Facebook | Partial (Graph API) | **n8n Facebook Graph API node** | Generic but flexible |
| Slack/Discord/Telegram | Yes (all) | **n8n nodes** | Full-featured native nodes |
