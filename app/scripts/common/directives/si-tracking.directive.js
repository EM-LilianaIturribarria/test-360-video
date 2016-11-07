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
