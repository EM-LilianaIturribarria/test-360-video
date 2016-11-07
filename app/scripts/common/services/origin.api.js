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
