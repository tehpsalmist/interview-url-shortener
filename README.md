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

Visit `localhost:3000` to use the client implementation and shorten urls.

### What is this doing (specifically)?

- [x] accepting requests at /url, expecting a POST body containing a `url` to shorten
- [x] asynchronously shortening that url and persisting the values and their associations (but very specifically not in a traditional database)
- [x] communicating with the client(s) about the results of the requested url shortening, specifically whether or not it finished
  - this will be handled via websocket connections, which is the only thing that made sense to me after reviewing the requirements, though I suppose you could use Push Notifications to deliver data to clients that can handle them.
  - the client can acknowledge receipt of the shortened url via this communication channel, as well. (Might as well store an "ack" value with the urls!)
- [x] responding to requests for successfully shortened urls with a JSON payload of `{"url":"...original url..."}`

### Implementation Principles

For purposes of this assignment, it is assumed that this is a _public_ URL shortener, and so there is no need to hide or protect pending shortening jobs. If someone wanted to listen in on pending jobs via some brute force url checker, that is fine. Implementing something that could protect URL short codes or pending jobs would be best accomplished with something like a conventional database and access control methodologies, or even just browser cookies representing sessions for each client, but this is a small project for an interview, and that seemed out of scope based on my reading of the requirements.

Each client tracks its own original urls, so upon connection to the websocket server, the client can notify the server of any outstanding shortening jobs, and the server takes over from there firing any relevant events.

In the spirit of the project, I tried to build my own implementation of as much of this as possible to show what I am capable of, but of course reinventing a router (express) and websocket manager (socket.io) was a little more than I could budget for this project. The UI was painfully built by hand, and in hindsight maybe I should have used React and Tailwind, but it is what it is now. The focus of the exercise was on the server functionality, and so that is where I devoted my effort. The client is minimal, but does use the entire API that I built.

### Extra Details

- **Progress tracking** shortening jobs emit progress events for every character generated in the 10-character short code.
- **Crash Resilience** if either the server or client crashes or goes offline, this app is capable of righting itself entirely once the connection is reestablished. Maybe that was part of the requirements, but I put some extra effort into it either way.
