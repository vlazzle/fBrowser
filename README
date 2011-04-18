In addition to jQuery and the lightBox plugin, I'm using Backbone.js, a lightweight MVC framework (http://documentcloud.github.com/backbone/),
which also ships with a handy library called Underscore.js (http://documentcloud.github.com/underscore/).

---

I've noticed some strange behavior in the higher pages numbers of a flickr.photos.search query.
For example, flickr.photos.search won't allow paging past page 10,000.

GET request:
  http://www.flickr.com/services/rest/?api_key=4cb641e5bce8988e4327ec4479a07287&text=cat&format=json&method=flickr.photos.search&page=74560
  or
  http://www.flickr.com/services/rest/?api_key=4cb641e5bce8988e4327ec4479a07287&text=cat&format=json&method=flickr.photos.search&page=10001
  or anything with page > 10000

formatted response:
  jsonFlickrApi({
      "photos": {
          "page": 10000,
          "pages": 74560,
          "perpage": 100,
          "total": "7455960",
          "photo": [ ... ]
      },
      "stat": "ok"
  })

---

It's been a while since I've investigated lightbox libraries, so I just went with the #1 Google result for "jquery lightbox plugin."
I found the keyboard navigation to be buggy in Chrome, so I disabled it.
Also, I had some difficulty in determining the best place to insert and remove the "Add to favorites" link, mostly because of all the callbacks going on in the plugin.
After fixing a few intermittent race conditions, I noticed that for some reason, the "Add to favorites" link occasionally appears a split second before it should.
After spending entirely too much time on this minor bug, I was able to reduce the frequency of occurrences (but not eliminate them completely) before calling it a day.

---

I didn't have a Windows installation handy, so I wasn't able to test in IE. I did, however, test in Firefox, Safari, and Chrome.

--

One feature I think is handy is the ability to cache a page of photos after the first time it's viewed.