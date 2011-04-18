var fBrowsr = (function () {
  // class of elements in the PhotoSet collection
  var Photo = Backbone.Model.extend({
    flickrUrl: function (size) {
      // default to thumbnail size
      size = _.isUndefined(size) ? 's' : size;
      
      return (
        'http://farm' + this.get('farm') +
        '.static.flickr.com/'+ this.get('server') +
        '/' + this.get('id') +
        '_' + this.get('secret') +
        '_' + size + '.jpg'
      );
    }
  });
  
  // fetch -> sync -> parse -> refresh -> add
  var PhotoSet = Backbone.Collection.extend({    
    model: Photo,
    
    initialize: function (spec) {
      this.searchText = spec.searchText;
      this.api_key = spec.api_key;
      this.api_endpoint = spec.api_endpoint;
      
      this.bind('refresh', function () {
        this.trigger('loading:stop');
      });
      
      this.responsesByPage = {};
    },
    
    // method parameter is assumed to be "read" and ignored
    sync: function (method, model, success) {
      var cachedResponse = model.cachedResponse();
      
      // only send out jsonp request if there is no response cached for the current page
      if (_.isUndefined(cachedResponse)) {
        model.trigger('loading:start');

        $.getJSON(
          model.api_endpoint + '?jsoncallback=?',
          {
            api_key: model.api_key,
            text: model.searchText,
            format: 'json',
            method: 'flickr.photos.search',
            page: _.isUndefined(model.page) ? 1 : model.page
          },
          success
        );
      }
      else {
        success(cachedResponse);
      }
    },
    
    parse: function (response) {
      if ('ok' !== response.stat) {
        // fail hard and fast
        throw response.stat + ' (code ' + response.code + '): ' + response.message;
      }
      
      this.pages = response.photos.pages;
      this.page = response.photos.page;
      this.perpage = response.photos.perpage;
      this.total = parseInt(response.photos.total);
      
      // cache response for current page
      this.responsesByPage[this.page] = response;
      
      // return value will be the argument to refresh
      return response.photos.photo;
    },
    
    numPages: function () {
      return this.pages;
    },
    
    currentPage: function () {
      return this.page;
    },
    
    loadPage: function (newPage) {
      this.page = newPage;
      this.fetch();
    },
    
    cachedResponse: function () {
      return this.responsesByPage[this.page];
    },
    
    totalPhotos: function () {
      return this.total;
    }
  });
  
  var PhotoGrid = Backbone.View.extend({
    initialize: function (spec) {
      this.numCols = parseInt(spec.numCols) || 10;
      
      _.bindAll(this, 'render');

      this.collection.bind('refresh', this.render);
      
      this.collection.bind('loading:start', function () {
        $('#loading').fadeIn();
      });
      
      this.collection.bind('loading:stop', function () {
        $('#loading').fadeOut();
      });
    },
    
    tdTemplate: _.template('<td><a href="<%= large %>" title="<%= title %>"><img src="<%= small %>" alt="<%= title %>" /></a></td>'),
    
    render: function () {
      $('#' + this.id).html('');
      
      var trs = [];
      
      for (var i = 0; i < this.collection.length / this.numCols; i++) {
        var tr = '<tr>',
            tds = [];

        for (var j = 0; j < this.numCols; j++) {
          var photo = this.collection.at(i * this.numCols + j);
          if (!_.isUndefined(photo)) {
             tds.push(this.tdTemplate({
               large: photo.flickrUrl('b'),
               small: photo.flickrUrl('s'),
               title: photo.escape('title'),
             }));
          }
        }

        tr += tds.join('');
        tr += '</tr>';
        trs.push(tr);
      }
      
      if (0 === this.collection.length) {
        trs.push('<tr><td>No photos here.</td></tr>')
      }
      
      $('#' + this.id).append(trs.join(""));
      
      // photo grid image links should open in lightbox
      $('#' + this.id + ' td a').lightBox();
      
      return this;
    }
  });
  
  var Pager = Backbone.View.extend({
    initialize: function () {
      var that = this;
      
      _.bindAll(this, 'render');
      
      this.collection.bind('refresh', this.render);
      
      $('#' + this.id + ' a').live('click', function () {
        var newPage = $(this).attr('data-pnum');
        that.collection.loadPage(newPage);
        return false;
      });
    },
    
    pageLink: _.template('<a href="#p<%= pnum %>" data-pnum="<%= pnum %>" title="go to page <%= pnum %>"><%= text %></a>'),
    
    render: function () {
      var that = this,
          totalPhotos = this.collection.totalPhotos(),
          currentPage = this.collection.currentPage(),
          totalPages = this.collection.numPages(),
          numPagesBefore = Math.min(5, currentPage - 1),
          numPagesAfter = Math.min(totalPages, 10) - numPagesBefore - 1,
          pagesBefore = _.range(currentPage - numPagesBefore, currentPage),
          pagesAfter = _.range(currentPage + 1, currentPage + numPagesAfter + 1),
          pages = pagesBefore.concat([currentPage], pagesAfter);
      
      var beforeLinks = _.map(pagesBefore, function (page) {
        return that.pageLink({
          pnum: page,
          text: page
        });
      });
      var afterLinks = _.map(pagesAfter, function (page) {
        return that.pageLink({
          pnum: page,
          text: page
        });
      });
      
      // links to first and last page
      var first = [], last = [];
      if (1 !== currentPage) {
        first.push(that.pageLink({
          pnum: 1,
          text: 'first'
        }));
      }
      if (totalPages !== currentPage && 0 !== totalPhotos) {
        last.push(that.pageLink({
          pnum: totalPages,
          text: 'last'
        }));
      }
      
      // only show pager if there's more than one page
      var currentPageNum = [];
      if (0 !== totalPhotos && 1 !== totalPages) {
        currentPageNum.push('<span class="currentp">' + currentPage + '</span>');
      }
      
      var pager = first.concat(beforeLinks, currentPageNum, afterLinks, last);
      
      $('#' + this.id).html(pager.join(' '));
      
      return this;
    }
  });
  
  var FavBox = Backbone.View.extend({
    favItem: _.template('<li style="display:none"><a href="<%= aHref %>" title="<%= caption %>"><img src="<%= imgSrc %>" alt="<%= caption %>" /></a></li>'),
    
    initialize: function () {
      this.render();
    },
    
    render: function () {
      var that = this;
      
      $('#' + this.id).unbind();
      
      // favorite photos should open in lightbox
      $('#' + this.id + ' a').lightBox();
      
      $('#' + this.id).bind('showFavLink', function () {
        var caption = $('#lightbox-image-details-caption').text(),
            aHref = $('#lightbox-image').attr('src'),
            imgSrc = aHref.replace(/\_\w.jpg$/, '_s.jpg');
        
        // don't show link to add to favorites if photo already in favorites
        if (0 === $('#' + that.id + ' a[href="' + aHref + '"]').length) {
          $('#lightbox-container-image').append('<p id="add-fav"><a href="#">Add to favorites &hearts;</a></p>');
        }

        $('#add-fav a').click(function () {
          $('#' + that.id).append(that.favItem({
            aHref: aHref,
            caption: caption,
            imgSrc: imgSrc
          }));
          $('#' + that.id + ' a:last').lightBox();
          
          var $addLink = $(this);
          var $newFav = $('#' + that.id + ' li:last');
          $newFav.slideDown('slow', function () {
            $addLink.fadeOut();
          });
          
          return false;
        });
      });
    }
  });
  
  var self = this;
  
  return {
    init: function (spec) {
      // clear out previous event bindings in case this isn't the first call to init
      var propertiesWithBindings = _(['photoSet', 'photoGrid', 'pager', 'favBox']);
      propertiesWithBindings.each(function (prop) {
        !_.isUndefined(self[prop]) && typeof self[prop].unbind === 'function' && self[prop].unbind();
      });
      
      // pass search query to new PhotoSet
      spec.searchText = $('#search-query').val();
      self.photoSet = new PhotoSet(spec);
      
      self.photoGrid = new PhotoGrid({
        collection: photoSet,
        tagName: 'tbody',
        id: 'photo-grid',
      });
  
      self.pager = new Pager({
        collection: photoSet,
        tagName: 'p',
        id: 'pager'
      });
      
      self.favBox = new FavBox({
        tagName: 'ul',
        id: 'fav-box'
      });
      
      // load photos
      self.photoSet.fetch();
    }
  };
})();