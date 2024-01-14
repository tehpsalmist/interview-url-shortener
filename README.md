# URL Shortener

This is a node.js server capable of shortening urls and communicating with clients about those urls asynchronously.

### How to run it

Required tech:

- node.js v20+
- nodemon (`npm i -g nodemon`)

Run these commands to get started:

```sh
git clone git@github.com:tehpsalmist/interview-url-shortener.git
cd interview-url-shortener
npm i
npm start
```

### What is this doing (specifically)?

- accepting requests at /url, expecting a POST body containing a url to shorten
- asynchronously shortening that url and storing the values and their associations (but very specifically not in a traditional database)
- communicating with the client(s) about the results of the requested url shortening, specifically whether or not it finished
  - this will be handled via websocket connections, which is the only thing that made sense to me after reviewing the requirements
  - the client can acknowledge receipt of the shortened url via this communication channel, as well. (Might as well store an "ack" value with the urls!)
- responding to requests for successfully shortened urls with a JSON payload of {"url":"...original url..."}
