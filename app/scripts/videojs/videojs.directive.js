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
