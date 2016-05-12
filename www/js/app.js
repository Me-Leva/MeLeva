angular.module('starter', ['ionic', 'starter.controllers', 'firebase', 'ion-autocomplete'])

  .run(function ($ionicPlatform) {
    $ionicPlatform.ready(function () {

      if (window.StatusBar) {
        StatusBar.styleDefault();
      }
    });
  })

  /* não é utilizado */
  //.run(function ($httpBackend) {
  //  $httpBackend.whenGET(/templates\/\w+.*/).passThrough();
  //})

  //configuração de rota
  .config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider

      .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'templates/inicio.html'
      })

      .state('app.login', {
        url: '/login',
        templateUrl: 'templates/login.html',
        controller: 'loginCtrl'
      })

      .state('app.novocadastro', {
        url: '/novocadastro',
        templateUrl: 'templates/novocadastro.html',
        controller: 'cadastroCtrl'
      })

      .state('app.principal', {
        url: '/principal',
        templateUrl: 'templates/principal.html',
        controller: 'principalCtrl'
      })

      .state('app.pedircarona', {
        url: '/pedircarona',
        templateUrl: 'templates/pedircarona.html',
        controller: 'pedirCaronaCtrl'
      })

      .state('app.oferecercarona', {
        url: '/oferecercarona',
        templateUrl: 'templates/oferecercarona.html',
        controller: 'oferecerCaronaCtrl'
      })

      .state('app.detalhecarona', {
        url: '/detalhecarona/:Id',
        templateUrl: 'templates/detalhecarona.html',
        controller: 'detalheCaronaCtrl'
      })

      .state('app.historicocarona', {
        url: '/historicocarona',
        templateUrl: 'templates/historicocarona.html',
        controller: 'historicoCaronaCtrl'
      });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/app/principal');
  })

  /* função para validar as mudanças de rota*/
  .run(function ($rootScope, $state, AuthService, AUTH_EVENTS) {
    $rootScope.$on('$stateChangeStart', function (event, next, nextParams, fromState) {

      /* if ('data' in next && 'authorizedRoles' in next.data) {
         var authorizedRoles = next.data.authorizedRoles;
         if (!AuthService.isAuthorized(authorizedRoles)) {
           event.preventDefault();
           $state.go($state.current, {}, {reload: true});
           $rootScope.$broadcast(AUTH_EVENTS.notAuthorized);
         }
       }*/

      /* valida se o usuário está autenticado(se já efetuou login) se não estiver autenticado muda para tela de login */
      if (!AuthService.isAuthenticated() && (next.name !== 'app.novocadastro')) {
        if (next.name !== 'app.login') {
          event.preventDefault();
          $state.go('app.login');
        }
      }
    });
  });