ZapFeedback
===========

Simple, one-click feedback software.

Use ZapFeedback to create one-question surveys that can be embedded in marketing/support emails, or directly on your site. In either case, customers can respond with just one click!

**OSS alternative, under active development:**  
ZapFeedback aims to be an Open Source alternative to CustomerThermometer, YesInsights, Delighted, etc. It is being actively developed by [Polydojo, Inc.](https://www.polydojo.com/), led by [Sumukh Barve](https://www.sumukhbarve.com/).

Getting Started
---------------

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
