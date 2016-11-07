(function () {
  'use strict';
  
  /** @ngInject */
  angular.module('app.common', [
    'angularSpinner'
  ]);

})();

(function () {
  'use strict';
  
  /** @ngInject */
  angular
  .module('app.common')
    .service('trackGAEvents', trackEvents);

  trackEvents.$inject = ['Angularytics', 'CONFIG'];

  function trackEvents(Angularytics, CONFIG) {
    var service = {
      record: record
    };

    return service;

    function record(action, label) {
      var category = CONFIG.analytics.ga.category;
      
      Angularytics.trackEvent(category, action, label);
    }
  }

})();

(function () {
  'use strict';

  /** @ngInject */
  angular
  .module('app.common')
    .service('trackEAEvents', trackEvents);

  trackEvents.$inject = ['OriginAPI'];

  function trackEvents(OriginAPI) {
    var service = {
      record: record
    };

    return service;

    function record(event, attr, value) {

      if(OriginAPI.isInitiated()){
        OriginAPI.trackEvent(event, attr, value);
      }
    }
  }

})();

(function () {
  'use strict';

  /** @ngInject */
  angular
    .module('app.common')
    .factory('preloaderService', preloaderService);

  preloaderService.$inject = ['preloader'];

  function preloaderService(preloader) {
    // I keep track of the state of the loading images.
    var isLoading = true;
    var isSuccessful = false;
    var percentLoaded = 0;

    // Preload the images; then, update display when returned.
    return {
      bind: function (images, eventHandlers) {
        preloader
          .preloadImages(images)
          .then(function handleResolve(imageLocations) {

          // Loading was successful.
          isLoading = false;
          isSuccessful = true;

          if (eventHandlers['complete']) { 
            eventHandlers['complete']();
          }
        }, function handleReject(imageLocation) {
          // Loading failed on at least one image.
          isLoading = false;
          isSuccessful = false;

          console.error('Image Failed', imageLocation);
          if (eventHandlers['error']) { 
            eventHandlers['error']();
          }
        }, function handleNotify(event) {
          percentLoaded = event.percent;
          if (eventHandlers['progress']) {
            eventHandlers['progress'](percentLoaded);
          }
        });
      }
    };
  }
})();

(function () {
  'use strict';
  
  /** @ngInject */
  angular
    .module('app.common')
    .factory('preloader', preloader);

  preloader.$inject = ['$q', '$rootScope'];

  function preloader($q, $rootScope) {

    // I manage the preloading of image objects. Accepts an array of image URLs.
    function Preloader(imageLocations) {

      // I am the image SRC values to preload.
      this.imageLocations = imageLocations;

      // As the images load, we'll need to keep track of the load/error
      // counts when announing the progress on the loading.
      this.imageCount = this.imageLocations.length;
      this.loadCount = 0;
      this.errorCount = 0;

      // I am the possible states that the preloader can be in.
      this.states = {
        PENDING: 1,
        LOADING: 2,
        RESOLVED: 3,
        REJECTED: 4
      };

      // I keep track of the current state of the preloader.
      this.state = this.states.PENDING;

      // When loading the images, a promise will be returned to indicate
      // when the loading has completed (and / or progressed).
      this.deferred = $q.defer();
      this.promise = this.deferred.promise;

    }

    // ---
    // STATIC METHODS.
    // ---

    // I reload the given images [Array] and return a promise. The promise
    // will be resolved with the array of image locations.
    Preloader.preloadImages = function (imageLocations) {

      var preloader = new Preloader(imageLocations);

      return (preloader.load());

    };

    // ---
    // INSTANCE METHODS.
    // ---

    Preloader.prototype = {

      // Best practice for "instnceof" operator.
      constructor: Preloader,

      // ---
      // PUBLIC METHODS.
      // ---

      // I determine if the preloader has started loading images yet.
      isInitiated: function isInitiated() {

        return (this.state !== this.states.PENDING);

      },

      // I determine if the preloader has failed to load all of the images.
      isRejected: function isRejected() {

        return (this.state === this.states.REJECTED);

      },

      // I determine if the preloader has successfully loaded all of the images.
      isResolved: function isResolved() {

        return (this.state === this.states.RESOLVED);

      },

      // I initiate the preload of the images. Returns a promise.
      load: function load() {

        // If the images are already loading, return the existing promise.
        if (this.isInitiated()) {

          return (this.promise);

        }

        this.state = this.states.LOADING;

        for (var i = 0; i < this.imageCount; i++) {

          this.loadImageLocation(this.imageLocations[i]);

        }

        // Return the deferred promise for the load event.
        return (this.promise);

      },

      // ---
      // PRIVATE METHODS.
      // ---

      // I handle the load-failure of the given image location.
      handleImageError: function handleImageError(imageLocation) {

        this.errorCount++;

        // If the preload action has already failed, ignore further action.
        if (this.isRejected()) {

          return;

        }

        this.state = this.states.REJECTED;

        this.deferred.reject(imageLocation);

      },

      // I handle the load-success of the given image location.
      handleImageLoad: function handleImageLoad(imageLocation) {

        this.loadCount++;

        // If the preload action has already failed, ignore further action.
        if (this.isRejected()) {

          return;

        }

        // Notify the progress of the overall deferred. This is different
        // than Resolving the deferred - you can call notify many times
        // before the ultimate resolution (or rejection) of the deferred.
        this.deferred.notify({
          percent: Math.ceil(this.loadCount / this.imageCount * 100),
          imageLocation: imageLocation
        });

        // If all of the images have loaded, we can resolve the deferred
        // value that we returned to the calling context.
        if (this.loadCount === this.imageCount) {

          this.state = this.states.RESOLVED;

          this.deferred.resolve(this.imageLocations);

        }

      },

      // I load the given image location and then wire the load / error
      // events back into the preloader instance.
      // --
      // NOTE: The load/error events trigger a $digest.
      loadImageLocation: function loadImageLocation(imageLocation) {

        var safeApply = function (fn) {
          var phase = $rootScope.$root.$$phase;
          if (phase === '$apply' || phase === '$digest') {
            if (fn && (typeof (fn) === 'function')) {
              fn();
            }
          } else {
            $rootScope.$apply(fn);
          }
        };

        var preloader = this;

        // When it comes to creating the image object, it is critical that
        // we bind the event handlers BEFORE we actually set the image
        // source. Failure to do so will prevent the events from proper
        // triggering in some browsers.
        var image = $(new Image())
          .load(function (event) {

          // Since the load event is asynchronous, we have to
          // tell AngularJS that something changed.
          $rootScope.$apply(function () {

            preloader.handleImageLoad(event.target.src);
            // Clean up object reference to help with the
            // garbage collection in the closure.
            preloader = image = event = null;
          });
        })
          .error(function (event) {
          // Since the load event is asynchronous, we have to
          // tell AngularJS that something changed.
          // $rootScope.$apply(function () {
          safeApply(function () {
            preloader.handleImageError(event.target.src);
            // Clean up object reference to help with the
            // garbage collection in the closure.
            preloader = image = event = null;
          });
        })
          .prop('src', imageLocation);
      }
    };
    // Return the factory instance.
    return (Preloader);
  }
})();

(function () {
  'use strict';
  angular
    .module('app.common')
    .service('OriginAPI', OriginAPI);

  function OriginAPI() {
    var originAPI = null;

    return {

        init: function(settings){
            originAPI = new OriginExternalAPI({
                adId: settings.adId,
                placement: settings.placement
            });
            return;
        },

        isInitiated: function(){
            return originAPI !== null ? true : false;
        },

        trackEvent: function(event, attr, value){
            originAPI.track({
              event: event,
              attr: attr,
              value: value
            });

            if(attr === 'URL'){
              originAPI.sendAnalytics(event, value);
            }
            return;
        },

        iframeResize: function(width, height, unit, ms){

            originAPI.iframeResize(width, height, unit, ms);
            console.log('%c Origin API. Iframe Resize event sent', 'font-weight:bold');
            return;
        },

        closeOverlay: function(){
            originAPI.closeOverlay();
            console.log('%c Origin API. Close event sent', 'font-weight:bold');
            return;
        },

        getClickthrus: function(){
            var self = this;
            var dfpVars = null;

            if(self.isInitiated() && window.name){
                try {
                    dfpVars = JSON.parse(decodeURIComponent(window.name));
                    console.log('%c Origin API. Get clickthrus '+dfpVars, 'font-weight:bold');
                } catch (e) {
                    console.error('Local: returning dummy clickthrus');
                    dfpVars = {
                        'clickthru1': 'http://staging.microsites.gorillanation.com/temp.html?i=1',
                        'clickthru2': 'http://staging.microsites.gorillanation.com/temp.html?i=2',
                        'clickthru3': 'http://staging.microsites.gorillanation.com/temp.html?i=3',
                        'clickthru4': 'http://staging.microsites.gorillanation.com/temp.html?i=4',
                        'clickthru5': 'http://staging.microsites.gorillanation.com/temp.html?i=5'
                    };
                }
            }

            return dfpVars;
        }
    };
  }

})();

(function () {
  'use strict';
  angular
    .module('app.common')
    .service('EvolveAnalytics', EvolveAnalytics);

  function EvolveAnalytics() {

    return {

      trackEvent: function(event, attr, value){
        window.ev.origin.api.track({
          event: event,
          attr: attr,
          value: value
        });

        if(attr === 'URL'){
          window.ev.origin.api.sendAnalytics(event, value);
        }
      }
    };
  }

})();

(function () {
  'use strict';

  angular
    .module('app.common')
    .directive('siTrack', tracker);

  tracker.$inject = [
      'trackEAEvents', 'trackGAEvents',
      '$timeout'
  ];

  function tracker(
    trackEAEvents, trackGAEvents,
    $timeout
  ) {

    return {
      scope: {
        ga : '@'
      },
      restrict: 'A',
      link: link
    };

    function link(scope, element, attrs) {
      var ga = scope.ga;
      var timer = null;

      function cleanUrl(rawUrl){
        var url = unescape(decodeURIComponent(rawUrl));

        if (url.match(/^http:\/\/www.*/g)){
          url = url.substring(11);
        } else if (url.match(/^https:\/\/www.*/g)){
          url = url.substring(12);
        } else if (url.match(/^http:\/\/.*/g)){
          url = url.substring(7);
        } else if (url.match(/^https:\/\/.*/g)){
          url = url.substring(8);
        }

        if (url.indexOf('doubleclick') > -1 && url.indexOf('?') > -1){
          url = url.substr(0, url.indexOf('?'));
        }else{
          url = url.substr(0, 65);
        }

        return url.trim();
      }

      element.on('click', function(e){
        if(attrs.href){
          trackEAEvents.record('Click', 'URL', cleanUrl(attrs.href));
          trackGAEvents.record('Click', ga + ' URL: ' + cleanUrl(attrs.href));
        }else{
          trackEAEvents.record('Click', 'Actions');
          trackGAEvents.record('Click', ga);
        }
      });

      // We won't track hover in EA
      // Adding hover intent
      element.on('mouseenter', function(){
        timer = $timeout(function(){
            if(attrs.href){
              trackGAEvents.record('Hover', ga + ' URL: ' + cleanUrl(attrs.href));
            }else{
              trackGAEvents.record('Hover', ga);
            }
        }, 300);
      });
      element.on('mouseleave', function(){
        $timeout.cancel(timer);
      });
    }
  }

})();

(function() {
  'use strict';
  
  /** @ngInject */
  angular.module('app.common')
    .config(siAiConfig)
    .directive('siAi',siAiDirective)
    .config(siAiFactoryConfig);
  
  siAiConfig.$inject = ['usSpinnerConfigProvider'];

  function siAiConfig(usSpinnerConfigProvider) {

    usSpinnerConfigProvider.setDefaults({
      'color':'white',
      'hwaccel':true,
      'length':10,
      'opacity':.15,
      'radius':12,
      'scale':1.5,
      'trail':30
    });
  }

  ///////////////
  // DIRECTIVE //
  ///////////////

  siAiDirective.$inject = [
    '$rootScope',
    '$timeout',
    'usSpinnerService',
    'siActivityIndicator'
  ];

  function siAiDirective(
    $rScope,
    $to,
    spinner,
    siAiService
  ){
    var directive = {
      controller:siAiController,
      link:siActivityIndicatorLink,
      replace:true,
      restrict:'AE',
      scope:{
        type:'@?'
      },
      template:makeTemplate()
    };

    siAiController.$inject = [
      '$scope',
      '$element'
    ];

    window.spinner = spinner;

    return directive;
    
    /////////////
    // CONTROLLER
    function siAiController(
      $scope,
      $element
    ){
      siAiService = angular
        .extend(siAiService,{
          'start':start,
          'stop':stop
        });

      function start() {
        spinner.spin('siai');
        $element.css('display','block');
      }

      function stop() {
        spinner.stop('siai');
        $element.css('display','none');
      }
    }
    
    ////////
    // LINK
    function siActivityIndicatorLink(
      scope,
      element
    ){
      element.css('display','none');

      $to(function(){
        siAiService.start();
      })
    }

  } // END siAiDirective

  /////////////
  // SERVICE //
  /////////////

  siAiFactoryConfig.$inject = ['$provide'];

  function siAiFactoryConfig($provide) {

    $provide.factory('siActivityIndicator',function() {
      var service = {
        'insert':insert
      };

      return service;

      function insert() {
        angular.element(document.body).prepend('<si-ai></si-ai>');
        return this;
      }
    });

  }

  ////////////
  // MAKERS //
  ////////////

  function makeTemplate() {
    
    return [
      "<div class='activity-indicator__wrapper'>",
      "<div class='activity-indicator' us-spinner spinner-key='siai'></div>",
      "</div>"
    ].join('')
  }

})();


(function () {
  'use strict';                

  angular
    .module('app.videojs', []);

})();

(function () {
  'use strict';

  angular
    .module('app.videojs')
    .directive('siVideoJs', siVideoJs);

  siVideoJs.$inject = [
    '$timeout', '$q',
    'trackGAEvents', 'trackEAEvents'
  ];

  /** @ngInject */
  function siVideoJs(
    $timeout, $q, 
    trackGAEvents, trackEAEvents
  ) {

    return {
      restrict: 'E', // [A]ttribute,[E]lement,[C]lass
      templateUrl: 'scripts/videojs/videojs.html',
      controller: 'VideoJSController',
      controllerAs: 'vm',
      link: link,
      scope:{
        video : '=',
        api:'=' // [@]String, [=]Object, [&]Expression to evaluate using parent scope.
      },
      replace: true,
      transclude: true
    };

    function link(scope, element, attrs) {
      var video = videojs('si-video-360');
      var api = scope.api;
      var ready = $q.defer();
      var firstPlay = true;
      var assetDuration = 0;
      var quartiles = {};
      var broadcasterQuartile = [];
      
      angular.extend(api, {
        'onVideoReady' : function(callback) {
          ready.promise.finally(callback);
          return this;
        },
        'play' : function() {
          trackGAEvents.record('Video', 'Start');
          trackEAEvents.record('Video', 'Start');
          video.play();
          
          $timeout(function(){
            firstPlay = false;
          });
          return this;
        }
      });

      video.on('canplaythrough', function() {
        video.panorama({
          clickAndDrag: true,
          callback: function(){

            $timeout(function(){
              api.callback();
            }, 150);
          }
        });
      });

      video.on('pause', function() {
        trackGAEvents.record('Video', 'Pause');
        trackEAEvents.record('Video', 'Pause');
      });

      video.on('play', function() {
        $timeout(function(){
          var canvas = video.getChild('Canvas');
          canvas.handleResize();
        });
        
        if(!firstPlay){
          trackGAEvents.record('Video', 'Resume');
          trackEAEvents.record('Video', 'Resume');
        }
      });

      video.on('seeking', function() {
        trackGAEvents.record('Video', 'Seek');
        trackEAEvents.record('Video', 'Seek');
      });

      video.on('volumechange', function() {
        if(video.muted){
          trackGAEvents.record('Video', 'Mute');
          trackEAEvents.record('Video', 'Mute');
        }else{
          trackGAEvents.record('Video', 'Unmute');
          trackEAEvents.record('Video', 'Unmute');
        }
      });

      video.on('durationchange', function (event) {
        assetDuration = video.duration;
        quartiles = {
          'VP_25': Math.round(25 * assetDuration) / 100,
          'VP_50': Math.round(50 * assetDuration) / 100,
          'VP_75': Math.round(75 * assetDuration) / 100
        };
      });

      video.on('timeupdate', function(){
        var quartile;

        if (assetDuration === 0){
          return;
        } 

        for (quartile in quartiles) {
          if ((quartiles[quartile] <= video.currentTime && 
              video.currentTime <= (quartiles[quartile] + 1))
          ) {
            if (broadcasterQuartile.indexOf(quartile) === -1) {
              broadcasterQuartile.push(quartile); 

              trackGAEvents.record('Video', quartile);
              trackEAEvents.record('Video', quartile);
            }
          }
        }
      });

      video.on('ended', function() {
        ready.resolve();

        trackGAEvents.record('Video', 'Finish');
        trackEAEvents.record('Video', 'Finish');

        $timeout(function(){
          api.onVideoEnded();
        }, 150);
      }, false);

      window.addEventListener('resize', function () {
        var canvas = video.getChild('Canvas');
        canvas.handleResize();
      });
    }
  }
})();

(function () {
  'use strict';

  /** @ngInject */
  angular
    .module('app.videojs')
    .controller('VideoJSController', VideoJSController);

  VideoJSController.$inject = ['$scope'];

  function VideoJSController($scope){
    var vm = this;
  }

})();

!function e(t,i,n){function o(a,s){if(!i[a]){if(!t[a]){var h="function"==typeof require&&require;if(!s&&h)return h(a,!0);if(r)return r(a,!0);var l=new Error("Cannot find module '"+a+"'");throw l.code="MODULE_NOT_FOUND",l}var c=i[a]={exports:{}};t[a][0].call(c.exports,function(e){var i=t[a][1][e];return o(i?i:e)},c,c.exports,e,t,i,n)}return i[a].exports}for(var r="function"==typeof require&&require,a=0;a<n.length;a++)o(n[a]);return o}({1:[function(e,t,i){"use strict";function n(e){return e&&"object"==typeof e&&"default"in e?e.default:e}function o(e){function t(o){i=requestAnimationFrame(t),e(o-(n||o)),n=o}var i,n;this.start=function(){i||t(0)},this.stop=function(){cancelAnimationFrame(i),i=null,n=0}}function r(e,t,i,n){function o(t){Boolean(e[i])===Boolean(n)&&t.stopImmediatePropagation(),delete e[i]}return e.addEventListener(t,o,!1),o}function a(e,t,i,n){function o(){return i[t]}function r(e){i[t]=e}n&&r(e[t]),Object.defineProperty(e,t,{get:o,set:r})}function s(e,t,i){i.addEventListener(t,function(){return e.dispatchEvent(new Event(t))})}function h(e,t){Promise.resolve().then(function(){e.dispatchEvent(new Event(t))})}function l(e){var t=new Audio;return s(e,"play",t),s(e,"playing",t),s(e,"pause",t),t.crossOrigin=e.crossOrigin,t.src=e.src||e.currentSrc||"data:",t}function c(e,t,i){(b||0)+200<Date.now()&&(e[T]=!0,b=Date.now()),i||(e.currentTime=t),R[++k%3]=100*t|0}function d(e){return e.driver.currentTime>=e.video.duration}function u(e){var t=this;t.video.readyState>=t.video.HAVE_FUTURE_DATA?(t.hasAudio||(t.driver.currentTime=t.video.currentTime+e*t.video.playbackRate/1e3,t.video.loop&&d(t)&&(t.driver.currentTime=0)),c(t.video,t.driver.currentTime)):t.video.networkState!==t.video.NETWORK_IDLE||t.video.buffered.length||t.video.load(),t.video.ended&&(delete t.video[T],t.video.pause(!0))}function f(){var e=this,t=e[M];return e.webkitDisplayingFullscreen?void e[x]():("data:"!==t.driver.src&&t.driver.src!==e.src&&(c(e,0,!0),t.driver.src=e.src),void(e.paused&&(t.paused=!1,e.buffered.length||e.load(),t.driver.play(),t.updater.start(),t.hasAudio||(h(e,"play"),t.video.readyState>=t.video.HAVE_ENOUGH_DATA&&h(e,"playing")))))}function p(e){var t=this,i=t[M];i.driver.pause(),i.updater.stop(),t.webkitDisplayingFullscreen&&t[E](),i.paused&&!e||(i.paused=!0,i.hasAudio||h(t,"pause"),t.ended&&(t[T]=!0,h(t,"ended")))}function v(e,t){var i=e[M]={};i.paused=!0,i.hasAudio=t,i.video=e,i.updater=new o(u.bind(i)),t?i.driver=l(e):(e.addEventListener("canplay",function(){e.paused||h(e,"playing")}),i.driver={src:e.src||e.currentSrc||"data:",muted:!0,paused:!0,pause:function(){i.driver.paused=!0},play:function(){i.driver.paused=!1,d(i)&&c(e,0)},get ended(){return d(i)}}),e.addEventListener("emptied",function(){var t=!i.driver.src||"data:"===i.driver.src;i.driver.src&&i.driver.src!==e.src&&(c(e,0,!0),i.driver.src=e.src,t?i.driver.play():i.updater.stop())},!1),e.addEventListener("webkitbeginfullscreen",function(){e.paused?t&&!i.driver.buffered.length&&i.driver.load():(e.pause(),e[x]())}),t&&(e.addEventListener("webkitendfullscreen",function(){i.driver.currentTime=e.currentTime}),e.addEventListener("seeking",function(){R.indexOf(100*e.currentTime|0)<0&&(i.driver.currentTime=e.currentTime)}))}function m(e){var t=e[M];e[x]=e.play,e[E]=e.pause,e.play=f,e.pause=p,a(e,"paused",t.driver),a(e,"muted",t.driver,!0),a(e,"playbackRate",t.driver,!0),a(e,"ended",t.driver),a(e,"loop",t.driver,!0),r(e,"seeking"),r(e,"seeked"),r(e,"timeupdate",T,!1),r(e,"ended",T,!1)}function g(e,t,i){void 0===t&&(t=!0),void 0===i&&(i=!0),i&&!y||e[M]||(v(e,t),m(e),e.classList.add("IIV"),!t&&e.autoplay&&e.play(),"MacIntel"!==navigator.platform&&"Windows"!==navigator.platform||console.warn("iphone-inline-video is not guaranteed to work in emulated environments"))}var b,w=n(e("poor-mans-symbol")),y=/iPhone|iPod/i.test(navigator.userAgent)&&void 0===document.head.style.grid,M=w(),T=w(),x=w("nativeplay"),E=w("nativepause"),R=[],k=0;g.isWhitelisted=y,t.exports=g},{"poor-mans-symbol":2}],2:[function(e,t,i){"use strict";var n="undefined"==typeof Symbol?function(e){return"@"+(e||"@")+Math.random()}:Symbol;t.exports=n},{}],3:[function(e,t,i){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}var o=e("../lib/Detector"),r=n(o),a=e("../lib/MobileBuffering"),s=n(a),h=e("./Util"),l=n(h),c=4,d=function(e){var t=arguments.length<=1||void 0===arguments[1]?{}:arguments[1];return{constructor:function(i,n){this.settings=n,this.width=i.el().offsetWidth,this.height=i.el().offsetHeight,this.lon=n.initLon,this.lat=n.initLat,this.phi=0,this.theta=0,this.videoType=n.videoType,this.clickToToggle=n.clickToToggle,this.mouseDown=!1,this.isUserInteracting=!1,this.VRMode=!1,this.scene=new THREE.Scene,this.camera=new THREE.PerspectiveCamera(n.initFov,this.width/this.height,1,2e3),this.camera.target=new THREE.Vector3(0,0,0),this.renderer=new THREE.WebGLRenderer,this.renderer.setPixelRatio(window.devicePixelRatio),this.renderer.setSize(this.width,this.height),this.renderer.autoClear=!1,this.renderer.setClearColor(0,1);var o=t.getTech(i);if(this.supportVideoTexture=r.default.supportVideoTexture(),this.supportVideoTexture)this.texture=new THREE.Texture(o);else{this.helperCanvas=i.addChild("HelperCanvas",{video:o,width:this.width,height:this.height});var a=this.helperCanvas.el();this.texture=new THREE.Texture(a)}o.style.display="none",this.texture.generateMipmaps=!1,this.texture.minFilter=THREE.LinearFilter,this.texture.maxFilter=THREE.LinearFilter,this.texture.format=THREE.RGBFormat;var s="equirectangular"===this.videoType?new THREE.SphereGeometry(500,60,40):new THREE.SphereBufferGeometry(500,60,40).toNonIndexed();if("fisheye"===this.videoType){for(var h=s.attributes.normal.array,l=s.attributes.uv.array,c=0,d=h.length/3;c<d;c++){var u=h[3*c+0],f=h[3*c+1],p=h[3*c+2],v=Math.asin(Math.sqrt(u*u+p*p)/Math.sqrt(u*u+f*f+p*p))/Math.PI;f<0&&(v=1-v);var m=0==u&&0==p?0:Math.acos(u/Math.sqrt(u*u+p*p));p<0&&(m*=-1),l[2*c+0]=-.8*v*Math.cos(m)+.5,l[2*c+1]=.8*v*Math.sin(m)+.5}s.rotateX(n.rotateX),s.rotateY(n.rotateY),s.rotateZ(n.rotateZ)}s.scale(-1,1,1),this.mesh=new THREE.Mesh(s,new THREE.MeshBasicMaterial({map:this.texture})),this.scene.add(this.mesh),this.el_=this.renderer.domElement,this.el_.classList.add("vjs-video-canvas"),n.el=this.el_,e.call(this,i,n),this.attachControlEvents(),this.player().on("play",function(){this.time=(new Date).getTime(),this.animate()}.bind(this)),n.callback&&n.callback()},enableVR:function(){if(this.VRMode=!0,"undefined"!=typeof vrHMD){var e=vrHMD.getEyeParameters("left"),t=vrHMD.getEyeParameters("right");this.eyeFOVL=e.recommendedFieldOfView,this.eyeFOVR=t.recommendedFieldOfView}this.cameraL=new THREE.PerspectiveCamera(this.camera.fov,this.width/2/this.height,1,2e3),this.cameraR=new THREE.PerspectiveCamera(this.camera.fov,this.width/2/this.height,1,2e3)},disableVR:function(){this.VRMode=!1,this.renderer.setViewport(0,0,this.width,this.height),this.renderer.setScissor(0,0,this.width,this.height)},attachControlEvents:function(){this.on("mousemove",this.handleMouseMove.bind(this)),this.on("touchmove",this.handleMouseMove.bind(this)),this.on("mousedown",this.handleMouseDown.bind(this)),this.on("touchstart",this.handleMouseDown.bind(this)),this.on("mouseup",this.handleMouseUp.bind(this)),this.on("touchend",this.handleMouseUp.bind(this)),this.settings.scrollable&&(this.on("mousewheel",this.handleMouseWheel.bind(this)),this.on("MozMousePixelScroll",this.handleMouseWheel.bind(this))),this.on("mouseenter",this.handleMouseEnter.bind(this)),this.on("mouseleave",this.handleMouseLease.bind(this))},handleResize:function(){this.width=this.player().el().offsetWidth,this.height=this.player().el().offsetHeight,this.camera.aspect=this.width/this.height,this.camera.updateProjectionMatrix(),this.VRMode&&(this.cameraL.aspect=this.camera.aspect/2,this.cameraR.aspect=this.camera.aspect/2,this.cameraL.updateProjectionMatrix(),this.cameraR.updateProjectionMatrix()),this.renderer.setSize(this.width,this.height)},handleMouseUp:function(e){if(this.mouseDown=!1,this.clickToToggle){var t=e.clientX||e.changedTouches[0].clientX,i=e.clientY||e.changedTouches[0].clientY,n=Math.abs(t-this.onPointerDownPointerX),o=Math.abs(i-this.onPointerDownPointerY);n<.1&&o<.1&&(this.player().paused()?this.player().play():this.player().pause())}},handleMouseDown:function(e){e.preventDefault();var t=e.clientX||e.touches[0].clientX,i=e.clientY||e.touches[0].clientY;this.mouseDown=!0,this.onPointerDownPointerX=t,this.onPointerDownPointerY=i,this.onPointerDownLon=this.lon,this.onPointerDownLat=this.lat},handleMouseMove:function(e){var t=e.clientX||e.touches[0].clientX,i=e.clientY||e.touches[0].clientY;if(this.settings.clickAndDrag)this.mouseDown&&(this.lon=.2*(this.onPointerDownPointerX-t)+this.onPointerDownLon,this.lat=.2*(i-this.onPointerDownPointerY)+this.onPointerDownLat);else{var n=e.pageX-this.el_.offsetLeft,o=e.pageY-this.el_.offsetTop;this.lon=n/this.width*430-225,this.lat=o/this.height*-180+90}},handleMobileOrientation:function(e){if("undefined"!=typeof e.rotationRate){var t=e.rotationRate.alpha,i=e.rotationRate.beta,n="undefined"!=typeof e.portrait?e.portrait:window.matchMedia("(orientation: portrait)").matches,o="undefined"!=typeof e.landscape?e.landscape:window.matchMedia("(orientation: landscape)").matches,r=e.orientation||window.orientation;if(n)this.lon=this.lon-i*this.settings.mobileVibrationValue,this.lat=this.lat+t*this.settings.mobileVibrationValue;else if(o){var a=-90;"undefined"!=typeof r&&(a=r),this.lon=a==-90?this.lon+t*this.settings.mobileVibrationValue:this.lon-t*this.settings.mobileVibrationValue,this.lat=a==-90?this.lat+i*this.settings.mobileVibrationValue:this.lat-i*this.settings.mobileVibrationValue}}},handleMouseWheel:function(e){e.stopPropagation(),e.preventDefault(),e.wheelDeltaY?this.camera.fov-=.05*e.wheelDeltaY:e.wheelDelta?this.camera.fov-=.05*e.wheelDelta:e.detail&&(this.camera.fov+=1*e.detail),this.camera.fov=Math.min(this.settings.maxFov,this.camera.fov),this.camera.fov=Math.max(this.settings.minFov,this.camera.fov),this.camera.updateProjectionMatrix(),this.VRMode&&(this.cameraL.fov=this.camera.fov,this.cameraR.fov=this.camera.fov,this.cameraL.updateProjectionMatrix(),this.cameraR.updateProjectionMatrix())},handleMouseEnter:function(e){this.isUserInteracting=!0},handleMouseLease:function(e){this.isUserInteracting=!1},animate:function(){if(this.requestAnimationId=requestAnimationFrame(this.animate.bind(this)),!this.player().paused()&&"undefined"!=typeof this.texture&&(!this.isPlayOnMobile&&this.player().readyState()===c||this.isPlayOnMobile&&this.player().hasClass("vjs-playing"))){var e=(new Date).getTime();if(e-this.time>=30&&(this.texture.needsUpdate=!0,this.time=e),this.isPlayOnMobile){var t=this.player().currentTime();s.default.isBuffering(t)?this.player().hasClass("vjs-panorama-mobile-inline-video-buffering")||this.player().addClass("vjs-panorama-mobile-inline-video-buffering"):this.player().hasClass("vjs-panorama-mobile-inline-video-buffering")&&this.player().removeClass("vjs-panorama-mobile-inline-video-buffering")}}this.render()},render:function(){if(!this.isUserInteracting){var e=this.lat>this.settings.initLat?-1:1,t=this.lon>this.settings.initLon?-1:1;this.settings.backToVerticalCenter&&(this.lat=this.lat>this.settings.initLat-Math.abs(this.settings.returnStepLat)&&this.lat<this.settings.initLat+Math.abs(this.settings.returnStepLat)?this.settings.initLat:this.lat+this.settings.returnStepLat*e),this.settings.backToHorizonCenter&&(this.lon=this.lon>this.settings.initLon-Math.abs(this.settings.returnStepLon)&&this.lon<this.settings.initLon+Math.abs(this.settings.returnStepLon)?this.settings.initLon:this.lon+this.settings.returnStepLon*t)}if(this.lat=Math.max(this.settings.minLat,Math.min(this.settings.maxLat,this.lat)),this.lon=Math.max(this.settings.minLon,Math.min(this.settings.maxLon,this.lon)),this.phi=THREE.Math.degToRad(90-this.lat),this.theta=THREE.Math.degToRad(this.lon),this.camera.target.x=500*Math.sin(this.phi)*Math.cos(this.theta),this.camera.target.y=500*Math.cos(this.phi),this.camera.target.z=500*Math.sin(this.phi)*Math.sin(this.theta),this.camera.lookAt(this.camera.target),this.supportVideoTexture||this.helperCanvas.update(),this.renderer.clear(),this.VRMode){var i=this.width/2,n=this.height;if("undefined"!=typeof vrHMD)this.cameraL.projectionMatrix=l.default.fovToProjection(this.eyeFOVL,!0,this.camera.near,this.camera.far),this.cameraR.projectionMatrix=l.default.fovToProjection(this.eyeFOVR,!0,this.camera.near,this.camera.far);else{var o=this.lon+this.settings.VRGapDegree,r=this.lon-this.settings.VRGapDegree,a=THREE.Math.degToRad(o),s=THREE.Math.degToRad(r),h=l.default.extend(this.camera.target);h.x=500*Math.sin(this.phi)*Math.cos(a),h.z=500*Math.sin(this.phi)*Math.sin(a),this.cameraL.lookAt(h);var c=l.default.extend(this.camera.target);c.x=500*Math.sin(this.phi)*Math.cos(s),c.z=500*Math.sin(this.phi)*Math.sin(s),this.cameraR.lookAt(c)}this.renderer.setViewport(0,0,i,n),this.renderer.setScissor(0,0,i,n),this.renderer.render(this.scene,this.cameraL),this.renderer.setViewport(i,0,i,n),this.renderer.setScissor(i,0,i,n),this.renderer.render(this.scene,this.cameraR)}else this.renderer.render(this.scene,this.camera)},playOnMobile:function(){this.isPlayOnMobile=!0,this.settings.autoMobileOrientation&&window.addEventListener("devicemotion",this.handleMobileOrientation.bind(this))},el:function(){return this.el_}}};t.exports=d},{"../lib/Detector":4,"../lib/MobileBuffering":6,"./Util":8}],4:[function(e,t,i){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol?"symbol":typeof e},o={canvas:!!window.CanvasRenderingContext2D,webgl:function(){try{var e=document.createElement("canvas");return!(!window.WebGLRenderingContext||!e.getContext("webgl")&&!e.getContext("experimental-webgl"))}catch(e){return!1}}(),workers:!!window.Worker,fileapi:window.File&&window.FileReader&&window.FileList&&window.Blob,Check_Version:function(){var e=-1;if("Microsoft Internet Explorer"==navigator.appName){var t=navigator.userAgent,i=new RegExp("MSIE ([0-9]{1,}[\\.0-9]{0,})");null!==i.exec(t)&&(e=parseFloat(RegExp.$1))}else if("Netscape"==navigator.appName)if(navigator.appVersion.indexOf("Trident")!==-1)e=11;else{var t=navigator.userAgent,i=new RegExp("Edge/([0-9]{1,}[\\.0-9]{0,})");null!==i.exec(t)&&(e=parseFloat(RegExp.$1))}return e},supportVideoTexture:function(){var e=this.Check_Version();return e===-1||e>=13},getWebGLErrorMessage:function(){var e=document.createElement("div");return e.id="webgl-error-message",this.webgl||(e.innerHTML=window.WebGLRenderingContext?['Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />','Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'].join("\n"):['Your browser does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br/>','Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'].join("\n")),e},addGetWebGLMessage:function(e){var t,i,n;e=e||{},t=void 0!==e.parent?e.parent:document.body,i=void 0!==e.id?e.id:"oldie",n=o.getWebGLErrorMessage(),n.id=i,t.appendChild(n)}};"object"===("undefined"==typeof t?"undefined":n(t))&&(t.exports=o)},{}],5:[function(e,t,i){"use strict";var n=document.createElement("canvas");n.className="vjs-video-helper-canvas";var o=function(e){return{constructor:function(t,i){this.videoElement=i.video,this.width=i.width,this.height=i.height,n.width=this.width,n.height=this.height,n.style.display="none",i.el=n,this.context=n.getContext("2d"),this.context.drawImage(this.videoElement,0,0,this.width,this.height),e.call(this,t,i)},getContext:function(){return this.context},update:function(){this.context.drawImage(this.videoElement,0,0,this.width,this.height)},el:function(){return n}}};t.exports=o},{}],6:[function(e,t,i){"use strict";var n={prev_currentTime:0,counter:0,isBuffering:function(e){return e==this.prev_currentTime?this.counter++:this.counter=0,this.prev_currentTime=e,this.counter>10&&(this.counter=10,!0)}};t.exports=n},{}],7:[function(e,t,i){"use strict";var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol?"symbol":typeof e},o=function(e){var t=document.createElement("div");return t.className="vjs-video-notice-label",{constructor:function(i,o){"object"==n(o.NoticeMessage)?(t=o.NoticeMessage,o.el=o.NoticeMessage):"string"==typeof o.NoticeMessage&&(t.innerHTML=o.NoticeMessage,o.el=t),e.call(this,i,o)},el:function(){return t}}};t.exports=o},{}],8:[function(e,t,i){"use strict";function n(){var e,t=document.createElement("fakeelement"),i={transition:"transitionend",OTransition:"oTransitionEnd",MozTransition:"transitionend",WebkitTransition:"webkitTransitionEnd"};for(e in i)if(void 0!==t.style[e])return i[e]}function o(){var e=!1;return function(t){(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(t)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(t.substr(0,4)))&&(e=!0)}(navigator.userAgent||navigator.vendor||window.opera),e}function r(){return/iPhone|iPad|iPod/i.test(navigator.userAgent)}function a(){return/iPhone|iPod/i.test(navigator.platform)}function s(e){var t=2/(e.leftTan+e.rightTan),i=(e.leftTan-e.rightTan)*t*.5,n=2/(e.upTan+e.downTan),o=(e.upTan-e.downTan)*n*.5;return{scale:[t,n],offset:[i,o]}}function h(e,t,i,n){t=void 0===t||t,i=void 0===i?.01:i,n=void 0===n?1e4:n;var o=t?-1:1,r=new THREE.Matrix4,a=r.elements,h=s(e);return a[0]=h.scale[0],a[1]=0,a[2]=h.offset[0]*o,a[3]=0,a[4]=0,a[5]=h.scale[1],a[6]=-h.offset[1]*o,a[7]=0,a[8]=0,a[9]=0,a[10]=n/(i-n)*-o,a[11]=n*i/(i-n),a[12]=0,a[13]=0,a[14]=o,a[15]=0,r.transpose(),r}function l(e,t,i,n){var o=Math.PI/180,r={upTan:Math.tan(e.upDegrees*o),downTan:Math.tan(e.downDegrees*o),leftTan:Math.tan(e.leftDegrees*o),rightTan:Math.tan(e.rightDegrees*o)};return h(r,t,i,n)}function c(e,t){if(null==e||"object"!=("undefined"==typeof e?"undefined":d(e)))return e;if(e.constructor!=Object&&e.constructor!=Array)return e;if(e.constructor==Date||e.constructor==RegExp||e.constructor==Function||e.constructor==String||e.constructor==Number||e.constructor==Boolean)return new e.constructor(e);t=t||new e.constructor;for(var i in e)t[i]="undefined"==typeof t[i]?c(e[i],null):t[i];return t}var d="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol?"symbol":typeof e};t.exports={whichTransitionEvent:n,mobileAndTabletcheck:o,isIos:r,isRealIphone:a,fovToProjection:l,extend:c}},{}],9:[function(e,t,i){"use strict";var n=function(e){return{constructor:function(t,i){e.call(this,t,i)},buildCSSClass:function(){return"vjs-VR-control "+e.prototype.buildCSSClass.call(this)},handleClick:function(){var e=this.player().getChild("Canvas");e.VRMode?e.disableVR():e.enableVR(),e.VRMode?this.addClass("enable"):this.removeClass("enable"),e.VRMode?this.player().trigger("VRModeOn"):this.player().trigger("VRModeOff")},controlText_:"VR"}};t.exports=n},{}],10:[function(e,t,i){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}function o(e){var t=e.getChild("Canvas");return function(){e.el().style.width=window.innerWidth+"px",e.el().style.height=window.innerHeight+"px",t.handleResize()}}function r(e,t){var i=o(e);e.controlBar.fullscreenToggle.off("tap",t),e.controlBar.fullscreenToggle.on("tap",function(){var t=e.getChild("Canvas");e.isFullscreen()?(e.isFullscreen(!1),e.exitFullWindow(),e.el().style.width="",e.el().style.height="",t.handleResize(),window.removeEventListener("devicemotion",i)):(e.isFullscreen(!0),e.enterFullWindow(),i(),window.addEventListener("devicemotion",i))})}Object.defineProperty(i,"__esModule",{value:!0});var a=e("./lib/Util"),s=n(a),h=e("./lib/Detector"),l=n(h),c=e("iphone-inline-video"),d=n(c),u=s.default.mobileAndTabletcheck(),f={clickAndDrag:u,showNotice:!0,NoticeMessage:"Please use your mouse drag and drop the video.",autoHideNotice:3e3,scrollable:!0,initFov:75,maxFov:105,minFov:51,initLat:0,initLon:-180,returnStepLat:.5,returnStepLon:2,backToVerticalCenter:!u,backToHorizonCenter:!u,clickToToggle:!1,minLat:-85,maxLat:85,minLon:-(1/0),maxLon:1/0,videoType:"equirectangular",rotateX:0,rotateY:0,rotateZ:0,autoMobileOrientation:!1,mobileVibrationValue:s.default.isIos()?.022:1,VREnable:!0,VRGapDegree:2.5},p=function(e,t,i){if(e.addClass("vjs-panorama"),!l.default.webgl)return v(e,{NoticeMessage:l.default.getWebGLErrorMessage(),autoHideNotice:t.autoHideNotice}),void(t.callback&&t.callback());e.addChild("Canvas",s.default.extend(t));var n=e.getChild("Canvas");if(u){var o=i.getTech(e);s.default.isRealIphone()&&(0,d.default)(o,!0),s.default.isIos()&&r(e,i.getFullscreenToggleClickFn(e)),e.addClass("vjs-panorama-mobile-inline-video"),e.removeClass("vjs-using-native-controls"),n.playOnMobile()}t.showNotice&&e.on("playing",function(){v(e,s.default.extend(t))}),t.VREnable&&e.controlBar.addChild("VRButton",{},e.controlBar.children().length-1),n.hide(),e.on("play",function(){n.show()}),e.on("fullscreenchange",function(){n.handleResize()})},v=function(e){var t=arguments.length<=1||void 0===arguments[1]?{NoticeMessage:""}:arguments[1],i=e.addChild("Notice",t);t.autoHideNotice>0&&setTimeout(function(){i.addClass("vjs-video-notice-fadeOut");var e=s.default.whichTransitionEvent(),t=function t(){i.hide(),i.removeClass("vjs-video-notice-fadeOut"),i.off(e,t)};i.on(e,t)},t.autoHideNotice)},m=function(){var e=arguments.length<=0||void 0===arguments[0]?{}:arguments[0],t=["equirectangular","fisheye"],i=function(i){var n=this;e.mergeOption&&(i=e.mergeOption(f,i)),t.indexOf(i.videoType)==-1&&f.videoType,this.ready(function(){p(n,i,e)})};return i.VERSION="0.0.7",i};i.default=m},{"./lib/Detector":4,"./lib/Util":8,"iphone-inline-video":1}],11:[function(e,t,i){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}function o(e){return e.tech?e.tech.el():e.h.el()}function r(e){return e.controlBar.fullscreenToggle.onClick||e.controlBar.fullscreenToggle.u}var a=e("./lib/Canvas"),s=n(a),h=e("./lib/Notice"),l=n(h),c=e("./lib/HelperCanvas"),d=n(c),u=e("./lib/VRButton"),f=n(u),p=e("./plugin"),v=n(p),m=videojs.Component,g=function(e,t){this.constructor(e,t)},b=(0,s.default)(m,{getTech:o});b.init=g,videojs.Canvas=m.extend(b);var w=(0,l.default)(m);w.init=g,videojs.Notice=m.extend(w);var y=(0,d.default)(m);y.init=g,videojs.HelperCanvas=m.extend(y);var M=videojs.Button,T=(0,f.default)(M);T.init=g,T.onClick=T.u=T.handleClick,T.buttonText=T.ta=T.controlText_,T.T=function(){return"vjs-VR-control "+M.prototype.T.call(this)},videojs.VRButton=M.extend(T),videojs.plugin("panorama",(0,v.default)({mergeOption:function(e,t){return videojs.util.mergeOptions(e,t)},getTech:o,getFullscreenToggleClickFn:r}))},{"./lib/Canvas":3,"./lib/HelperCanvas":5,"./lib/Notice":7,"./lib/VRButton":9,"./plugin":10}]},{},[11]);
(function () {
  'use strict';
  
  /** @ngInject */
  angular.module('app.core', [
    'ngCookies',
    'ngResource',
    'ngSanitize',
    'ngRoute',
    'ngAnimate',
    'angularSpinner',
    'angularytics'
  ]);

})();

(function () {
  'use strict';

  /** @ngInject */
  angular
    .module('app.core')
    .run(initAnalytics)
    .config(configure);

  initAnalytics.$inject = [
    'Angularytics', 'CONFIG',
    '$location', 'OriginAPI'
  ];

  /** @ngInject */
  function initAnalytics(
    Angularytics, CONFIG,
    $location, OriginAPI
  ){
    // Override AdId if found
    var adId = $location.search().adId;

    // Init GA
    ga('create', CONFIG.analytics.ga.id);
    Angularytics.init();

    // Init EA
    if((typeof CONFIG.analytics.ea) !== 'undefined' &&
        (CONFIG.analytics.ea !== null)){

      // Init Origin API
      OriginAPI.init({
        adId : adId ? adId : CONFIG.analytics.ea.id,
        placement : CONFIG.analytics.ea.placement
      });
    }
  }

  configure.$inject = [
    '$routeProvider', '$provide', 
    'AngularyticsProvider'
  ];

  /** @ngInject */
  function configure(
    $routeProvider, $provide, 
    AngularyticsProvider
  ){
    AngularyticsProvider.setEventHandlers(['GoogleUniversal']);

    $routeProvider
      .when('/', {
        templateUrl: 'scripts/core/main.html',
        controller: 'MainController',
        controllerAs: 'vm'
    })
    .otherwise({
      redirectTo: '/'
    });

    $provide.constant('CONFIG', {

      // Set here your analytics data
      'analytics': {

        // Google Analytics
        // Don't change the id, we are always tracking internally
        // to Integration Marketing Account
        // Change the category according to the name of 
        // your project
        'ga' : {
          'id': 'UA-12310597-137',
          'category':'[TEST] 360 Video - MOBILE'
        },

        // Evolve Analytics
        // For now... we can only track events sent 
        // from iframes living inside origin
        // Set the id of the origin product you created 
        // For placement, use overthepage for overlays,
        // or inpage 
        // In case you don't need EA (standalone) set it to null
        'ea' : {
         'id' : 1749,
         'placement' : 'overthepage'
        }
      },

      'preload': {
        'images': [
          'assets/images/angular.png'
        ]
      },

      'settings': {
        'type' : 'video'
      }

    });
  }

})();

(function () {
  'use strict';

  angular
    .module('app.core')
    .controller('MainController', MainController);
  
  MainController.$inject = [
    '$q', '$scope',
    '$timeout', 'CONFIG',
    'preloaderService', 'trackGAEvents',
    'siActivityIndicator'
  ];
  
  /** @ngInject */
  function MainController(
    $q, $scope,
    $timeout, CONFIG,
    preloader, trackGAEvents,
    siAi
  ){
    var vm = this;
    vm.app = {
      ready: false,
      type: CONFIG.settings.type,
      videojs : {
        ended: false,
        api: {
          callback: function(){
            vm.onVideoReady();
          },
          onVideoEnded: function(){
            vm.onVideoComplete();
          }
        }
      }
    };
    // 'preload' object that holds
    // defs map and promises array.
    // ADD any promise to preload.promises
    // array that should be fulfilled while
    // preload is animating.
    var preload = {
      'defs': {}
    };

    preload.promises = [
      (preload.defs.images = $q.defer()).promise,
      (preload.defs.video = $q.defer()).promise
    ];

    // Start SI ActivityIndicator;
    siAi.start();

    // Pass image list to preloadService
    // with 'preload.defs.images.resolve' as callback.
    preloader.bind(
      CONFIG.preload.images,
      {
        'complete': preload.defs.images.resolve
      }
    );

    // Solve Promise when video is ready to play
    vm.onVideoReady = function() {
      vm.app.ready = true;
      preload.defs.video.resolve();
    };

    // Do something on video ended
    vm.onVideoComplete = function(){
      vm.app.videojs.ended = true;
    };
    
    // When all preload promises are resolved
    $q.all(preload.promises)
      .then(function() {
        var video = !!vm.app.videojs.api.play;
        // Tracking only load for GA 
        // in EA we dont track it as Origin
        // takes care of that
        trackGAEvents.record('[Load]');
        siAi.stop();
        video ? vm.app.videojs.api.play() : angular.noop();
      });
  }
})();

(function () {
  'use strict';                

  /** @ngInject */
  angular.module('app', [      
    'app.core',
    'app.common',
    'app.videojs'
  ]);
  
  // use this as an alternative aproach to bootstraping the app withing the
  // html element, <body ng-app="app" ng-strict-di>
  angular.element(document).ready(function () {
     angular.bootstrap(document.getElementsByTagName('body')[0], ['app'], {
       'strictDi': true 
     });
   });

})();

angular.module("app").run(["$templateCache", function($templateCache) {$templateCache.put("index.html","<!doctype html>\r\n<html>\r\n  <head>\r\n    <meta charset=\"utf-8\">\r\n    <title>EV SI IFRAME</title>\r\n    <meta name=\"description\" content=\"\">\r\n    <meta name=\"viewport\" content=\"width=device-width\">\r\n    <!-- Place favicon.ico and apple-touch-icon.png in the root directory -->\r\n\r\n    <!-- build:css({.tmp/serve,app}) styles/vendor.css -->\r\n    <!-- bower:css -->\r\n    <!-- run `gulp inject` to automatically populate bower styles dependencies -->\r\n    <!-- endbower -->\r\n    <!-- endbuild -->\r\n\r\n    <!-- build:css({.tmp/serve,app}) styles/app.css -->\r\n    <!-- inject:css -->\r\n    <!-- css files will be automatically insert here -->\r\n    <!-- endinject -->\r\n    <!-- endbuild -->\r\n  </head>\r\n  <body>\r\n    <!--[if lt IE 10]>\r\n      <p class=\"browsehappy\">You are using an <strong>outdated</strong> browser. Please <a href=\"http://browsehappy.com/\">upgrade your browser</a> to improve your experience.</p>\r\n    <![endif]-->\r\n\r\n	<div class=\"si-wrapper\">\r\n        <si-ai></si-ai>\r\n        <div ng-show=\"vm.app.ready\" class=\"si-wrapper__main\" ng-view></div>\r\n    </div>\r\n\r\n    <!-- GA Script -->\r\n	<script>\r\n	(function(i,s,o,g,r,a,m){i[\'GoogleAnalyticsObject\']=r;i[r]=i[r]||function(){\r\n	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),\r\n	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)\r\n	})(window,document,\'script\',\'//www.google-analytics.com/analytics.js\',\'ga\');\r\n	</script>\r\n    <!-- End GA Script -->\r\n\r\n    <!-- Origin External API Script -->\r\n    <!-- <script src=\"//management.originplatform.com/js/libs/amd/OriginExternalAPI.js\"></script> -->\r\n    <script src=\"https://secureassets.evolvemediallc.com/js/libs/amd/OriginExternalAPI.js\"></script>\r\n    <!-- End Origin External API Script -->\r\n\r\n    <!-- build:js(app) scripts/vendor.js -->\r\n    <!-- bower:js -->\r\n    <!-- run `gulp inject` to automatically populate bower script dependencies -->\r\n    <!-- endbower -->\r\n    <!-- endbuild -->\r\n\r\n    <!-- build:js({.tmp/serve,.tmp/partials,app}) scripts/app.js -->\r\n    <!-- inject:js -->\r\n    <!-- js files will be automatically insert here -->\r\n    <!-- endinject -->\r\n\r\n    <!-- inject:partials -->\r\n    <!-- angular templates will be automatically converted in js and inserted here -->\r\n    <!-- endinject -->\r\n    <!-- endbuild -->\r\n\r\n  </body>\r\n</html>\r\n");
$templateCache.put("scripts/core/main.html","<!-- BEGIN VideoJS Directive -->\r\n<si-video-js api=\"vm.app.videojs.api\">\r\n  <source ng-if=\"vm.app.type === \'video\'\" ng-src=\"assets/videos/video.mp4\" type=\"video/mp4\">\r\n</si-video-js>\r\n<!-- END VideoJS Directive -->");
$templateCache.put("scripts/videojs/videojs.html","<div class=\"si-wrapper__main__videojs\">\r\n  <video videojs id=\"si-video-360\" class=\"video-js vjs-default-skin\" controls preload=\"auto\" width=\"320\" height=\"420\" crossorigin=\"anonymous\" ng-transclude>\r\n    <p class=\"vjs-no-js\">\r\n      Your browser does not support HTML5 video.\r\n    </p>\r\n  </video>\r\n</div>");
$templateCache.put("index.html","<!doctype html>\r\n<html>\r\n  <head>\r\n    <meta charset=\"utf-8\">\r\n    <title>EV SI IFRAME</title>\r\n    <meta name=\"description\" content=\"\">\r\n    <meta name=\"viewport\" content=\"width=device-width\">\r\n    <!-- Place favicon.ico and apple-touch-icon.png in the root directory -->\r\n\r\n    <!-- build:css({.tmp/serve,app}) styles/vendor.css -->\r\n    <!-- bower:css -->\r\n    <link rel=\"stylesheet\" href=\"../bower_components/angular-toastr/dist/angular-toastr.css\">\r\n    <link rel=\"stylesheet\" href=\"../bower_components/animate.css/animate.css\">\r\n    <link rel=\"stylesheet\" href=\"../bower_components/videojs/dist/video-js/video-js.css\">\r\n    <!-- endbower -->\r\n    <!-- endbuild -->\r\n\r\n    <!-- build:css({.tmp/serve,app}) styles/app.css -->\r\n    <!-- inject:css -->\r\n    <link rel=\"stylesheet\" href=\"styles/index.css\">\r\n    <!-- endinject -->\r\n    <!-- endbuild -->\r\n  </head>\r\n  <body>\r\n    <!--[if lt IE 10]>\r\n      <p class=\"browsehappy\">You are using an <strong>outdated</strong> browser. Please <a href=\"http://browsehappy.com/\">upgrade your browser</a> to improve your experience.</p>\r\n    <![endif]-->\r\n\r\n	<div class=\"si-wrapper\">\r\n        <si-ai></si-ai>\r\n        <div ng-show=\"vm.app.ready\" class=\"si-wrapper__main\" ng-view></div>\r\n    </div>\r\n\r\n    <!-- GA Script -->\r\n	<script>\r\n	(function(i,s,o,g,r,a,m){i[\'GoogleAnalyticsObject\']=r;i[r]=i[r]||function(){\r\n	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),\r\n	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)\r\n	})(window,document,\'script\',\'//www.google-analytics.com/analytics.js\',\'ga\');\r\n	</script>\r\n    <!-- End GA Script -->\r\n\r\n    <!-- Origin External API Script -->\r\n    <!-- <script src=\"//management.originplatform.com/js/libs/amd/OriginExternalAPI.js\"></script> -->\r\n    <script src=\"https://secureassets.evolvemediallc.com/js/libs/amd/OriginExternalAPI.js\"></script>\r\n    <!-- End Origin External API Script -->\r\n\r\n    <!-- build:js(app) scripts/vendor.js -->\r\n    <!-- bower:js -->\r\n    <script src=\"../bower_components/angular/angular.js\"></script>\r\n    <script src=\"../bower_components/jquery/jquery.js\"></script>\r\n    <script src=\"../bower_components/angular-resource/angular-resource.js\"></script>\r\n    <script src=\"../bower_components/angular-cookies/angular-cookies.js\"></script>\r\n    <script src=\"../bower_components/angular-sanitize/angular-sanitize.js\"></script>\r\n    <script src=\"../bower_components/angular-route/angular-route.js\"></script>\r\n    <script src=\"../bower_components/angular-animate/angular-animate.js\"></script>\r\n    <script src=\"../bower_components/angularytics/dist/angularytics.min.js\"></script>\r\n    <script src=\"../bower_components/spin.js/spin.js\"></script>\r\n    <script src=\"../bower_components/angular-spinner/angular-spinner.js\"></script>\r\n    <script src=\"../bower_components/angular-bootstrap/ui-bootstrap-tpls.js\"></script>\r\n    <script src=\"../bower_components/malarkey/dist/malarkey.min.js\"></script>\r\n    <script src=\"../bower_components/angular-toastr/dist/angular-toastr.tpls.js\"></script>\r\n    <script src=\"../bower_components/moment/moment.js\"></script>\r\n    <script src=\"../bower_components/underscore/underscore.js\"></script>\r\n    <script src=\"../bower_components/three.js/three.min.js\"></script>\r\n    <script src=\"../bower_components/videojs/dist/video-js/video.js\"></script>\r\n    <!-- endbower -->\r\n    <!-- endbuild -->\r\n\r\n    <!-- build:js({.tmp/serve,.tmp/partials,app}) scripts/app.js -->\r\n    <!-- inject:js -->\r\n    <script src=\"scripts/common/common.module.js\"></script>\r\n    <script src=\"scripts/common/services/trackGA-events.service.js\"></script>\r\n    <script src=\"scripts/common/services/trackEA-events.service.js\"></script>\r\n    <script src=\"scripts/common/services/preloader.service.js\"></script>\r\n    <script src=\"scripts/common/services/preloader.js\"></script>\r\n    <script src=\"scripts/common/services/origin.api.js\"></script>\r\n    <script src=\"scripts/common/services/evolve.analytics.js\"></script>\r\n    <script src=\"scripts/common/directives/si-tracking.directive.js\"></script>\r\n    <script src=\"scripts/common/directives/si-activity-indicator.directive.js\"></script>\r\n    <script src=\"scripts/videojs/videojs.module.js\"></script>\r\n    <script src=\"scripts/videojs/videojs.directive.js\"></script>\r\n    <script src=\"scripts/videojs/videojs.controller.js\"></script>\r\n    <script src=\"scripts/videojs/videojs-panorama.v4.js\"></script>\r\n    <script src=\"scripts/core/core.module.js\"></script>\r\n    <script src=\"scripts/core/config.js\"></script>\r\n    <script src=\"scripts/core/app.controller.js\"></script>\r\n    <script src=\"scripts/app.module.js\"></script>\r\n    <!-- endinject -->\r\n\r\n    <!-- inject:partials -->\r\n    <!-- angular templates will be automatically converted in js and inserted here -->\r\n    <!-- endinject -->\r\n    <!-- endbuild -->\r\n\r\n  </body>\r\n</html>\r\n");}]);