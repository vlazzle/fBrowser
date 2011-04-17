var fBrowsr = (function () {
  var self = this;
  
  var Photo = Backbone.Model.extend({
    flickrUrl: function (size) {
      size = typeof size === 'undefined' ? 's' : size;
      
      return (
        'http://farm' + this.get('farm') +
        '.static.flickr.com/'+ this.get('server') +
        '/' + this.get('id') +
        '_' + this.get('secret') +
        '_' + size + '.jpg'
      );
    }
  });
  
  var PhotoSet = Backbone.Collection.extend({    
    model: Photo,
    
    initialize: function (spec) {
      this.searchText = spec.searchText;
      this.api_key = spec.api_key;
      this.api_endpoint = spec.api_endpoint;

      console.debug('searchText: ' + this.searchText);
      
      this.bind('refresh', function () {
        this.trigger('loading:stop');
      });
    },
    
    // method parameter is assumed to be "read" and ignored
    sync: function (method, model) {
      model.trigger('loading:start');
      
      $.getJSON(
        model.api_endpoint + '?jsoncallback=?',
        {
          api_key: model.api_key,
          text: model.searchText,
          format: 'json',
          method: 'flickr.photos.search'
        },
        function (data) {
          console.debug(typeof data);
          console.debug(data);
          model.refresh(model.parse(data));
        }
      );
    },
    
    parse: function (response) {
      console.debug('parsing');
      if ('ok' !== response.stat) {
        throw response.stat + ' (code ' + response.code + '): ' + response.message;
      }
      
      // do something with response.photos
      console.debug(response);
      
      this.pages = response.photos.pages;
      this.page = response.photos.page;
      this.perpage = response.photos.perpage;
      this.total = parseInt(response.photos.total);
      
      return response.photos.photo;
    },
    
    numPages: function () {
      return this.pages;
    },
    
    currentPage: function () {
      return this.page;
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
          if (typeof photo !== 'undefined') {
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
      
      console.debug('got ' + this.collection.length);
      
      $('#' + this.id).append(trs.join(""));
            
      $('#' + this.id + ' td a').lightBox();
      
      return this;
    }
  });
  
  var Pager = Backbone.View.extend({
    initialize: function () {
      this.numPages = this.collection
      _.bindAll(this, 'render');
    }
  });
  
  var photoSet, photoGrid, pager;
  
  $.extend(self, {
    init: function (spec) {
      spec.searchText = $('#q').val();
      photoSet = new PhotoSet(spec);
      
      photoGrid = new PhotoGrid({
        collection: photoSet,
        tagName: 'tbody',
        id: 'photo-grid',
      });
      
      pager = new Pager({
        collection: photoSet,
        tagName: 'p',
        id: 'pager'
      });
      
      console.debug('calling fetch');
      photoSet.fetch();
    },
  });
  
  return self;
})();