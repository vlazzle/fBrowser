feTest = (function () {
  var api_key = '4cb641e5bce8988e4327ec4479a07287',
      api_secret = '344adbc2fe4ff660',
      api_endpoint = 'http://www.flickr.com/services/rest/';
  
  var setDefaultParam = function (params, key, defaultVal) {
    if (typeof params[key] === 'undefined') {
      params[key] =  defaultVal;
    }
  };
  
  var Photo = Class.extend({
    init: function (photo) {
      this.photo = photo;
    },
    
    url: function (size) {
      if (typeof size === 'undefined') {
        size = 'm';
      }
      return 'http://farm' + this.photo.farm + '.static.flickr.com/' + this.photo.server + '/' + this.photo.id + '_' + this.photo.secret + '_' + size + '.jpg';
    },
    
    title: function () {
      return this.photo.title;
    }
  });
  
  var PhotoSet = Class.extend({
    init: function (photos) {
      var that = this;
      
      this.photosByPage = {};
      this.setPhotos(photos);
    },

    // fetchPage: function (pageNum) {
    //   if (typeof photosByPage[pageNum] === 'undefined') {
    //     feTest.api_call({
    //       method: 'flickr.photos.search',
    //       text: text,
    //       page: pageNum
    //     });
    //   }
    //   else {
    //     feTest.photosReady();
    //   }
    // },
    
    setPhotos: function (photos) {
      var that = this;
      if (typeof photos === 'undefined') {
        this.currentPhotos = {
          page: 0,
          pages: 0,
          perpage: 0,
          photo: [],
          total: 0
        };
      }
      else {
        this.currentPhotos = photos;
        this.photosByPage[this.currentPhotos.page] = [];
        
        $.each(this.currentPhotos.photo, function (i, photo) {
          that.photosByPage[that.currentPhotos.page].push(new feTest.Photo(photo));
        });
      }
    },
    
    currentPagePhotos: function () {
      return this.photosByPage[this.currentPhotos.page];
    }
  });
  
  var self = {
    Photo: Photo,
    PhotoSet: PhotoSet,    
    
    photoSet: new PhotoSet(),
    
    api_call: function (params) {
      if (typeof params.method === 'undefined') {
        throw 'params map should contain `method` key';
      }
      
      setDefaultParam(params, 'api_key', api_key);
      setDefaultParam(params, 'format', 'json');
      
      var paramArray = [];
      $.each(params, function (k, v) {
        paramArray.push(k + '=' + v);
      });
      var paramString = paramArray.join('&');
      
      var url = api_endpoint + '?' + paramString;
        '?api_key=' + api_key +
        '&format=' + params.format +
        '&method=' + params.method;

      console.debug(url);
      
      $('#waiting span').fadeIn();
      $.get(url, function (data, textStatus, jqXHR) {
        eval(data);
        $('#waiting span').fadeOut();
      });
    },
    
    responseHandlers: {
      basic: function (response) {
        if ('ok' !== response.stat) {
          throw response.stat + ' (code ' + response.code + '): ' + response.message;
        }

        console.debug(response);
      },
      
      search: function (response) {
        feTest.responseHandlers.basic(response);
        feTest.photoSet.setPhotos(response.photos);
        feTest.photosReady();
      }
    },
    
    getRecent: function () {
      feTest.api_call({
        jsoncallback: 'feTest.responseHandlers.search',
        method: 'flickr.photos.getRecent'
      });
    },
  
    search: function (text) {
      feTest.api_call({
        jsoncallback: 'feTest.responseHandlers.search',
        method: 'flickr.photos.search',
        text: text
      });
    },
    
    photosReady: function () {
      $('#photos tbody').html(feTest.views.photoGrid(this.photoSet.currentPagePhotos()));
    },
    
    test: function () {
      self.search('cat');
    },
    
    views: {
      photoGrid: function (photoSet) {
        var numCols = 10;
        
        for (var i = 0; i < photoSet.length; i++) {
          var tr = '<tr>';
          for (var j = 0; j < numCols; j++) {
            var photo = photoSet[i * numCols + j];
            var td;
            if (typeof photo === 'undefined') {
              continue;
            }
            else {
               tr += '<td><img src="' + photo.url('s') + '" alt="' + photo.title() + '"/></td>';
            }
          }
          tr += "</tr>";
          $('#photos tbody').append(tr);
        }
      }
    }
  }

  return self;
}());