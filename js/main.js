fBrowsr = (function () {
  var photoSet, photoGrid,
      that = this;
  
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
      // $.extend(this, spec);
      this.searchText = spec.searchText;
      this.api_key = spec.api_key;
      this.api_endpoint = spec.api_endpoint;
      console.debug('searchText: ' + this.searchText);
      console.debug('api_key: ' + this.api_key);
    },
    
    parse: function (response) {
      console.debug('parsing');
      if ('ok' !== response.stat) {
        throw response.stat + ' (code ' + response.code + '): ' + response.message;
      }
      
      // do something with response.photos
      console.debug(response);
      
      return response.photos.photo;
    },
    
    fetch: function () {
      console.debug('fetching');
      var argsArray = Array.prototype.slice.call(arguments, 0);
      this.trigger('loading:start');
      return Backbone.Collection.prototype.fetch.call(this, argsArray);
    },
    
    sync: function (method, model, success, error) {      
      console.debug('syncing');
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
    }
  });
  
  var PhotoGrid = Backbone.View.extend({
    initialize: function (spec) {
      this.numCols = parseInt(spec.numCols) || 10;
      
      _.bindAll(this, 'render');
    },
    
    render: function () {
      $('#loading').fadeOut();
      
      $('#' + this.id).html('');
      
      var tdTemplate = _.template('<td><a href="<%= large %>" title="<%= title %>"><img src="<%= small %>" alt="<%= title %>" /></a></td>'),
          trs = [];
      
      for (var i = 0; i < this.collection.length / this.numCols; i++) {
        var tr = '<tr>',
            tds = [];

        for (var j = 0; j < this.numCols; j++) {
          var photo = this.collection.at(i * this.numCols + j);
          if (typeof photo !== 'undefined') {
             tds.push(tdTemplate({
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
  
  $.extend(that, {
    init: function (spec) {
      spec.searchText = $('#q').val();
      photoSet = new PhotoSet(spec);
      
      photoGrid = new PhotoGrid({
        collection: photoSet,
        tagName: 'tbody',
        id: 'photo-grid',
      });
      
      photoSet.bind('refresh', function (collection, options) {
        console.debug('refresh');
        photoGrid.render();
      });
      
      photoSet.bind('loading:start', function (collection, options) {
        $('#loading').fadeIn();
      });
      
      console.debug('calling fetch');
      photoSet.fetch();
    },
  });
  
  return that;
})();