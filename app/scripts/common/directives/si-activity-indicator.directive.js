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

