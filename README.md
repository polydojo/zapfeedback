ZapFeedback
===========

Simple, one-click feedback software.

Use ZapFeedback to create one-question surveys that can be embedded in marketing/support emails, or directly on your site. In either case, customers can respond with just one click!

**OSS alternative, under active development:**  
ZapFeedback aims to be an Open Source alternative to CustomerThermometer, YesInsights, Delighted, etc. It is being actively developed by [Polydojo, Inc.](https://www.polydojo.com/), led by [Sumukh Barve](https://www.sumukhbarve.com/).

How It Works
------------

**Creation: Three Simple Steps!**

1. Create a one-question survey. (Login to ZapFeedback & click 'New Question'.)
2. Email the survey to your audience (via your ESP) or embed it website/blog.
3. Sit back and relax. Once reponses start coming in, view them in ZapFeedback.

**Responding: Just One Click!**
Your audience can complete your survey with just one click, either directly from their inbox, or on your site. For surveys emailed via supported ESPs, respondents' email address are auto-captured. Respondents may choose add additional comments, if they feel like it.

**List of Supported ESPs** (Email Service Provider), as of 07 July 2021:
1. ActiveCampaign
1. Autopilot
1. AWeber
1. Benchmark
1. Campaign Monitor
1. Constant Contact
1. ConvertKit
1. Customer.io
1. Drip
1. Mad Mimi
1. Mailchimp
1. MailerLite
1. EmailOctopus
1. GetResponse
1. Klaviyo
1. Vero

Sending via a non-marketing-oriented email service like **Gmail/Hotmail** is also supported, but in that case, the respondent's email address can't be auto-captured. The same is also true for surveys embedded on websites.

Installation
------------

1. Clone the repo and change into it:
    - `git clone https://github.com/polydojo/zapfeedback.git`
    - `cd zapfeedback`
2. Install backend and frontend dependencies:
    - `pip install -r requirements.txt`
    - `npm install`
3. Copy the environment configuration template (for dev):
    - `cp env-example.txt env-dev.txt`
4. Edit `env-dev.txt`, specify (or replace) *at least* the following:
    - `DATABASE_URL`: Full MongoDB connection string.
    - `SECRET_KEY`: A secure, randomly generated token.
5. Bundle frontend code and start the app:
    - `npx webpack`
    - `python appRun.py env-dev.txt`
6. Visit http://localhost:8080/setup to set up the first user!


**Tips:** (a) For hot reloads use, `npx webpack --watch` along with `hupper -m appRun env-dev.txt`. (b) To generate `SECRET_KEY`, use `secrets.token_urlsafe()` from the secrets module.

Code Standard
-------------
- Black for Python: `black .`
- Standard for JS: `npx standard --fix`

Licensing
---------

Copyright (c) 2021 Polydojo, Inc.

**Software Licensing:**  
The software is released "AS IS" under the **GNU AGPLv3** (version 3 only), WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. Kindly see [LICENSE.txt](./LICENSE.txt) for more details.

**No Trademark Rights:**  
The above software licensing terms **do not** grant any right in the trademarks, service marks, brand names or logos of Polydojo, Inc.
