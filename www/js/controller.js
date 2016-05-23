angular.module('starter.controllers', ['firebase'])

    // constantes do sistema
    // estas constantes não estão sendo usadas no momento
    .constant('AUTH_EVENTS', {
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    })

    .constant('USER_ROLES', {
        admin: 'admin_role',
        public: 'public_role'
    })

    //serviços do sistema
    // serviço de autenticação do usuário salva o login no storage local do usuário
    .service('AuthService', function ($q, $http, USER_ROLES) {
        var LOCAL_TOKEN_KEY = 'yourTokenKey';
        /* nome do usuário*/
        var usuario = {};
        /* booleano que indica se o usuário está autenticado ou não */
        var isAuthenticated = false;
        var role = '';
        var authToken;

        // carrega as credenciais do usuário
        function loadUserCredentials() {
            var token = window.localStorage.getItem(LOCAL_TOKEN_KEY);

            if (token) {
                var tokenAntigo = token.split('.')[3];

                if (tokenAntigo === 'yourServerToken') {
                    destroyUserCredentials();
                } else {
                    useCredentials(token);
                }
            }

        }

        // salva as credenciais do usuário
        function storeUserCredentials(usuarioLog) {
            var token = JSON.stringify(usuarioLog);

            window.localStorage.setItem(LOCAL_TOKEN_KEY, token);
            useCredentials(token);
        }

        function useCredentials(token) {
            usuario = JSON.parse(token);

            isAuthenticated = true;
            authToken = usuario.token;

            if (usuario.nome == 'admin') {
                role = USER_ROLES.admin
            } else {
                role = USER_ROLES.public
            }

            // Set the token as header for your requests!
            //  $http.defaults.headers.common['X-Auth-Token'] = token;
        }

        // reseta as credenciais do usuário
        function destroyUserCredentials() {
            authToken = undefined;
            usuario = {};
            isAuthenticated = false;
            //    $http.defaults.headers.common['X-Auth-Token'] = undefined;
            window.localStorage.removeItem(LOCAL_TOKEN_KEY);
        }

        // realiza o login do usuário com as credenciais
        var login = function (usuario) {
            return $q(function (resolve, reject) {
                if (usuario.nome != 'admin') {
                    usuario.token = 'yourServerToken';

                    storeUserCredentials(usuario);
                    resolve('Login success.');
                } else {
                    reject('Login failed.');
                }
            });
        };

        // realiza o logout
        var logout = function () {
            destroyUserCredentials();
        };

        /* var isAuthorized = function (authorizedRoles) {
             if (!angular.isArray(authorizedRoles)) {
                 authorizedRoles = [authorizedRoles];
             }
             return (isAuthenticated && authorizedRoles.indexOf(role) !== -1);
         }; */

        // carrega as credenciais, faz o ini() do serviço
        loadUserCredentials();

        // trata os retornos do serviço
        return {
            login: login,
            logout: logout,
            //    isAuthorized: isAuthorized,
            isAuthenticated: function () { return isAuthenticated; },
            matricula: function () { return usuario.matricula; },
            usuarioLogado: function () { return usuario; },
            role: function () { return role; }
        };
    })

    //controllers
    .controller('AppCtrl', function ($scope, $state, $ionicPopup, AuthService, AUTH_EVENTS) {

        // seta os usuários com os valores iniciais    
        $scope.usuarioLogado = AuthService.usuarioLogado();

        // encerra a sessão
        $scope.$on(AUTH_EVENTS.notAuthenticated, function (event) {
            AuthService.logout();
            $state.go('app.login');
            var alertPopup = $ionicPopup.alert({
                title: 'Sessão Perdida',
                template: 'É preciso logar novamente.'
            });
        })

        // define o usuário logado
        $scope.setCurrentUsername = function (usuario) {
            $scope.usuarioLogado = usuario;
        };
    })

    // controller da tela de login
    .controller('loginCtrl', function ($scope, $rootScope, $ionicModal, $ionicPopup, $timeout, $state, $http, $location, $firebaseArray, $firebase, AuthService) {

        // url do banco de dados
        var FIREBASE_URL = "https://amber-torch-3328.firebaseio.com/";

        $scope.loginData = {
            matricula: '',
            senha: ''
        };

        $scope.session = {
            senha: null,
            logado: false,
            bloqueado: false,
            tentativas: 0,
            nome: ''
        };

        $scope.gotoNovo = function () {
            // console.log("entrou no novo")
            $scope.closeLogin();
            // $state.go('app.novo');
            $location.path('/app/novo');

        };

        // perform the login action when the user submits the login form
        $scope.doLogin = function () {


            if ($scope.session.bloqueado == false) {

                // faz a requisição para buscar o usuário
                var urlGet = FIREBASE_URL + 'usuarios/' + $scope.loginData.matricula + '.json';

                $http.get(urlGet).then(function (resp) {

                    // se encontrar o usuário preenche a sessão
                    if ((resp.data != null) && (resp.data.senha == $scope.loginData.senha)) {

                        $scope.session.senha = resp.data.senha;
                        $scope.session.logado = true;
                        $scope.session.tentativas = 0;
                        $scope.session.nome = resp.data.nome;
                        // esconde a msg de erro
                        $scope.loginData.erro = false;

                        // reseta os valores do campo
                        $scope.loginData.matricula = '';
                        $scope.loginData.senha = '';

                        // salva no rootScope o objeto do usuario
                        // $rootScope.usuarioLogado = resp.data;

                        // $state.go('app.principal');

                        //efetua o login salvando os dados do usuário no storageLocal
                        AuthService.login(resp.data).then(function (authenticated) {
                            $state.go('app.principal', {}, { reload: true });
                            //   $scope.setCurrentUsername(resp.data.nome, resp.data.matricula)
                        }, function (err) {
                            var alertPopup = $ionicPopup.alert({
                                title: 'Falha no Login',
                                template: 'Verifique os dados informados.'
                            });
                        });

                    } else {
                        $scope.loginData.erro = true;
                        $scope.loginData.erroMsg = 'Matrícula ou senha inválida.';
                        $scope.session.tentativas += 1;


                        // se fizer 3 tentativas de logar sem sucesso, bloquea o usuário
                        if ($scope.session.tentativas == 3) {
                            // alert("Você foi bloqueado, excedeu as 3 tentativas possíveis. Tente novamente daqui a 10 segundos.");
                            $scope.loginData.erroMsg = 'Limite de tentativas excedido. Tente novamente em 10 segundos.';
                            $scope.session.bloqueado = true;
                            $scope.session.tentativas = 0;

                            setTimeout(function () {
                                $scope.loginData.erro = false;
                                $scope.session.bloqueado = false;
                            }, 10000);
                        }
                    }
                },
                    function (err) {
                        console.error('ERR', err);
                    });
            }

        };
        
        // função que recupera a senha do ususário
        $scope.recuperarSenha = function () {
            
            $scope.data = {};

            // popup que solicita o email do usuario
            var myPopup = $ionicPopup.show({
                template: '<input type="email" ng-model="data.email">',
                title: 'Informe o email cadastrado:',
                scope: $scope,
                buttons: [
                    { text: 'Cancelar' },
                    {
                        text: '<b>OK</b>',
                        type: 'button-positive',
                        onTap: function(e) {
                            if (!$scope.data.email) {
                                
                                // impede que o usuário forneça um email em branco
                                e.preventDefault();
                            } else {
                                
                                // requisição que obtem os dados do usuario
                                $http({
                                    method: 'GET',
                                    url: 'https://amber-torch-3328.firebaseio.com/usuarios.json?orderBy="email"&equalTo="' + $scope.data.email + '"'
                                    
                                // caso a requisição seja bem sucedida...
                                }).then(function successCallback(response) {
                                    
                                    // transforma o objeto recebido em string
                                    var responseString = JSON.stringify(response.data);
                                    
                                    // verifica se a string corresponde a um usuario existente
                                    if (responseString.length > 10) {
                                        
                                        // extrai a senha da string
                                        var startIndex = responseString.search('senha');
                                        var endIndex = responseString.search('telefone');
                                        var passwordString = responseString.substring(startIndex + 8, endIndex - 3);
                                        
                                        //gerar senha randômica
                                        var novaSenha = 0;
                                        for (var i=0; i<7; i++){
			                                novaSenha += getRandomChar();
		                                }
                                        
                                        function getRandomChar(){
                                            var ascii = [[48, 57],[64,90],[97,122]];
                                            var i = Math.floor(Math.random()*ascii.length);
                                            return String.fromCharCode(Math.floor(Math.random()*(ascii[i][1]-ascii[i][0]))+ascii[i][0]);
                                        }
                                       $scope.data.senha = novaSenha;
                                       
                                       // atualiza os dados do usuario substituindo a senha antiga pela nova senha
                                       $http({
                                          method: 'PATCH',
                                          url: 'https://amber-torch-3328.firebaseio.com/usuarios/' + response.data.matricula +'.json',
                                          data: {
                                               'senha': $scope.data.senha
                                          }// caso a requisição seja bem sucedida...
                                       });
                                       
                                        // requisição que envia email com a senha do usuario
                                        $http({

                                            method: 'POST',
                                            //url: 'https://api.postmarkapp.com/email',
                                            url: 'http://localhost:8100/email',
                                            headers: {
                                                'Accept': 'application/json',
                                                'Access-Control-Allow-Origin': '*',
                                                'Content-Type': 'application/json',
                                                'X-Postmark-Server-Token': 'ec674a03-ea04-4d61-a8ba-4b2f652ab097'
                                            },
                                            data: {
                                                "From": "c2543836@trbvn.com",
                                                "To": $scope.data.email,
                                                "Subject": "Redefinição de Senha - MeLeva!",
                                                "HtmlBody": "<p>Prezado(a) Usuário(a)</p><p>Conforme solicitado, segue sua senha de acesso ao Aplicativo MeLeva!</p><p><p>Senha: " + $scope.data.senha + ".</p></p><p>Ao acessar o aplicativo, favor acessar a opção 'Alterar Cadastro' e realizar a troca de senha, assim você pode escolher uma de sua preferência, também pode alterar seus dados cadastrais e o e-mail de recebimento deste.</p>Importante: esta é uma mensagem automática e não deve ser respondida.<br>Política de Segurança: O MeLeva! nunca envia arquivos executáveis ou solicitação de dados pessoais. Para sua segurança mantenha atualizado o antivírus do seu computador.<br><br>Atenciosamente,<br>Equipe MeLeva!"
                                            } 

                                            // caso a requisição seja bem sucedida, informa o usuário que o email foi enviado
                                        }).then(function successCallback(response) {

                                            var alertPopup = $ionicPopup.alert({
                                                title: 'Senha enviada por email.'
                                            });

                                            // caso a requisição falhe, exibe mensagem de erro
                                        }, function errorCallback(response) {

                                            var alertPopup = $ionicPopup.alert({
                                                title: 'Erro',
                                                template: 'Não foi possível enviar a senha por email.'
                                            });

                                        });                                         
                                        
                                    }
                                    else {
                                        var alertPopup = $ionicPopup.alert({
                                            title: 'Erro',
                                            template: 'O email informado não está cadastrado.'
                                        });
                                    }
                                                                                                         
                                // caso a requisição falhe, exibe mensagem de erro
                                }, function errorCallback(response) {
                                    
                                    var alertPopup = $ionicPopup.alert({
                                        title: 'Erro',
                                        template: 'Não foi possível validar o email informado.'
                                    });                                                                  
                                });
                                                                                                                                                                                                                                                                
                            }
                        }
                    }
                ]
            });  
        };
    })


    // controller da tela principal
    .controller('principalCtrl', function ($scope, $state, $ionicPopover, AuthService) {

        // função que inicia o controlller
        $scope.ini = function () {
            $scope.usuarioLogado = AuthService.usuarioLogado();
        }

        //efetua o logout
        $scope.doLogout = function () {                       
            AuthService.logout();
            $state.go('app.login');
        };
        
        // .fromTemplate() method
        var template = '<ion-popover-view class="fit"><ion-content><div class="list"><button class="button button-full button-calm" ui-sref="app.alterarcadastro" ng-click="closePopover()">Alterar Cadastro</button><button class="button button-full button-calm" ui-sref="app.login" ng-click="doLogout();closePopover()">Sair</button></div></ion-content></ion-popover-view>';

        $scope.popover = $ionicPopover.fromTemplate(template, {
            scope: $scope
        }); 

        $scope.openPopover = function($event) {
            $scope.popover.show($event);
        };
        $scope.closePopover = function() {
            $scope.popover.hide();
        };

        $scope.ini();

    })




    // controller da tela de pedir carona
    .controller('pedirCaronaCtrl', function ($scope, $rootScope, $ionicPopup, $timeout, $http, $state, $firebase, AuthService) {

        // url do banco de dados
        var FIREBASE_URL = "https://amber-torch-3328.firebaseio.com/";
        var pedidosCarona = new Firebase(FIREBASE_URL + "caronas");

        // busca os dados o usuário logado
        var usuarioLogado = AuthService.usuarioLogado();

        //zera os segundos do cronometro como valor inicial
        var cronometroSegundos, cronometroMinutos;
        var cronometroInterval = 0;

        $scope.init = function () {
            $scope.carona = {};

            // define os valores iniciais dos campos da tela
            $scope.carona.opcao = 'O';
            $scope.carona.numPessoas = 1;
            $scope.carona.mostrarOrigem = true;
            $scope.carona.origem = '';
            $scope.carona.destino = '';
            $scope.carona.botaoPedirCarona = true;

            //limpa o cronometro da tela
            limpaCronometro();
        };

        //função para resetar o cronometro
        function limpaCronometro() {
            //reseta o intervalo do cronometro
            clearInterval(cronometroInterval);

            //reseta as variaveis
            cronometroSegundos = 10;
            cronometroMinutos = 0;
            $scope.cronometroTela = cronometroMinutos + '0:' + cronometroSegundos;
            $scope.mostraCronometro = false;

        };
        // habilita o campo origem/destino de acordo com a opção selecionada
        $scope.mostrarOpcao = function () {
            if ($scope.carona.opcao == 'O') {
                $scope.carona.mostrarOrigem = true;
                $scope.carona.mostrarDestino = false;
            } else {
                $scope.carona.mostrarOrigem = false;
                $scope.carona.mostrarDestino = true;
            }
        };

        // aumenta o contador de pessoas
        $scope.aumentaPessoas = function () {
            // define o máximo de pessoas
            if ($scope.carona.numPessoas < 4) {
                $scope.carona.numPessoas += 1;
            }
        };

        // diminui o contador de pessoas
        $scope.diminuiPessoas = function () {
            // só diminui se for maior do que 1, o número minimo é 1
            if ($scope.carona.numPessoas > 1) {
                $scope.carona.numPessoas -= 1;
            }
        };

        // função que cancela o pedido de carona
        $scope.cancelarCarona = function () {

            // verifica se realmente houve um pedido de carona
            if ($scope.carona.id) {

                // volta a exibir o botão pedir carona
                $scope.carona.botaoPedirCarona = true;
                $scope.carona.botaoCancelarCarona = false;

                //reseta o cronometro                
                limpaCronometro();

                // requisição que deleta a carona do banco de dados
                $http({

                    method: 'DELETE',
                    url: 'https://amber-torch-3328.firebaseio.com/caronas/' + $scope.carona.id + '.json'

                    // caso a requisição seja bem sucedida, informa o usuário que a carona foi cancelada
                }).then(function successCallback(response) {

                    var alertPopup = $ionicPopup.alert({
                        title: 'Seu pedido de carona foi cancelado.'
                    });

                    // caso a requisição falhe, exibe mensagem de erro
                }, function errorCallback(response) {

                    var alertPopup = $ionicPopup.alert({
                        title: 'Erro',
                        template: 'Não foi possível cancelar a carona.'
                    });

                });
            }
        }

        // função que cria o pedido de carona
        $scope.pedirCarona = function () {

            // verifica se o campo origem/destino está em branco
            if ((($scope.carona.origem == '') && ($scope.carona.opcao == 'O') && ($scope.clickedValueModel == '')) ||
                (($scope.carona.destino == '') && ($scope.carona.opcao == 'D') && ($scope.clickedValueModel == ''))) {

                // define que há um erro na tela de carona
                $scope.carona.erro = true;
                $scope.carona.erroMsg = 'O campo origem/destino é obrigatório.';
            }
            else {
                //reseta o valor da variavel de intervalo e mostra o cronometro                           
                //por segurança reseto o cronometro para iniciar novamente.
                limpaCronometro();
                $scope.mostraCronometro = true;

                //inicia o cronometro e chama a função a cada 1 segundo
                cronometroInterval = setInterval(function () {
                    //faz a contagem do cronometro
                    var hr = '', min = '', segs = '';

                    //adiciona os segundos
                    cronometroSegundos--;

                    // faz a contagem de minutos, adiciona um minuto a cada 60 segundos e zera os segundos
                    if ((cronometroSegundos == 0) && (cronometroMinutos > 0)) {
                        cronometroMinutos--;
                        cronometroSegundos = cronometroSegundos + 59;
                    }

                    //faz a formatação do tempo de como irá aparecer na tela            
                    if (cronometroMinutos < 10) { min = "0" + cronometroMinutos } else { min = cronometroMinutos };
                    if (cronometroSegundos < 10) { segs = "0" + cronometroSegundos } else { segs = cronometroSegundos };

                    //preeche a variavel de escopo com o valor do cronometro
                    $scope.cronometroTela = min + ":" + segs;

                    //atualiza o escopo
                    $scope.$apply();
                }, 1000);

                // define que não há erros na tela de carona
                $scope.carona.erro = false;

                // armazena o valor do campo origem/destino
                $scope.carona.origem = $scope.clickedValueModel.item.nome;
                $scope.carona.destino = $scope.clickedValueModel.item.nome;

                // obtém a data atual e converte pro modelo dia/mes
                var ISOStringDate = new Date().toISOString();
                var dateString = ISOStringDate.substr(8, 2) + ISOStringDate.substr(4, 4) + ISOStringDate.substr(0, 4);
                dateString = dateString.replace(/\D/ig, '/');

                // obtem a hora atual e converte pro modelo hora:minutos
                var hourString = ISOStringDate.substr(11, 5);
                var hourBrazil = hourString.substr(0, 2);
                hourBrazil = parseInt(hourBrazil) + 21;

                // aplica o fuso horário brasileiro
                if (hourBrazil > 23) { hourBrazil -= 24; }
                hourString = hourBrazil + hourString.substr(2, 3);

                // armazena o bairro e a cidade selecionados
                var addressString = $scope.clickedValueModel.item.nome;
                var addressArray = addressString.split(' - ');
                var bairro = addressArray[0];
                var cidade = addressArray[1];

                // verifica a opção selecionada: origem/destino da carona
                switch ($scope.carona.opcao) {

                    // usuário informa o destino, ou seja, está saindo da UVV
                    case 'D':
                        var bairroDestino = bairro;
                        var cidadeDestino = cidade;
                        var bairroOrigem = 'UVV';
                        var cidadeOrigem = 'Vila Velha';
                        break;

                    // usuário informa a origem, ou seja, está indo pra UVV
                    case 'O':
                        var bairroDestino = 'UVV';
                        var cidadeDestino = 'Vila Velha';
                        var bairroOrigem = bairro;
                        var cidadeOrigem = cidade;
                        break;

                    default:
                        var bairroDestino = '';
                        var cidadeDestino = '';
                        var bairroOrigem = '';
                        var cidadeOrigem = '';
                        break;
                }

                // obtem nova data no formato yyyyMMddhhmm
                var now = new Date();
                var strDateTime = now.getFullYear().toString() +
                    AddZero(now.getMonth() + 1).toString() +
                    AddZero(now.getDate()) +
                    AddZero(now.getHours()).toString() +
                    AddZero(now.getMinutes()).toString();

                // salva o pedido de carona no banco de dados
                var caronaIns = pedidosCarona.push();
                caronaIns.set({
                    'data': dateString,
                    'hora': hourString,
                    'dateTime': strDateTime,
                    'origem': {
                        'bairro': bairroOrigem,
                        'cidade': cidadeOrigem
                    },
                    'destino': {
                        'bairro': bairroDestino,
                        'cidade': cidadeDestino
                    },
                    'status': 'pendente',
                    'vagas': $scope.carona.numPessoas,
                    'motorista': false,
                    'solicitante': {
                        'matricula': usuarioLogado.matricula,
                        'nome': usuarioLogado.nome,
                        'telefone': usuarioLogado.telefone
                    }
                });

                // armazena a identificação da carona no banco de dados
                $scope.carona.id = caronaIns.path.o[1];

                // a carona foi pedida, exibe o botão cancelar carona
                $scope.carona.botaoPedirCarona = false;
                $scope.carona.botaoCancelarCarona = true;

                // valores iniciais do controle da carona
                var caronaIntervalCounter = 0;
                var nomeMotorista = '';
                var telefoneMotorista = '';

                // a cada 10 segundos, uma nova requisição é gerada
                // objetivo: verificar se algum motorista ofereceu carona
                // há um contador que interrompe o loop após X requisições
                var caronaInterval = setInterval(function () {

                    // requisição que verifica o status da carona no banco de dados
                    // status
                    // pendente: o pedido de carona foi criado no banco de dados
                    // oferecida: algum motorista viu o pedido e ofereceu carona
                    // aceita: o solicitante aceitou a carona oferecida
                    // recusada: o solicitante recusou a carona oferecida
                    $http({

                        method: 'GET',
                        url: 'https://amber-torch-3328.firebaseio.com/caronas/' + $scope.carona.id + '/status.json'

                        // caso a requisição seja bem sucedida...
                    }).then(function successCallback(response) {

                        switch (response.data) {
                            case 'oferecida':

                                // interrompe o loop de requisições
                                clearInterval(caronaInterval);

                                // volta a exibir o botão pedir carona
                                $scope.carona.botaoPedirCarona = true;
                                $scope.carona.botaoCancelarCarona = false;

                                //reseta o cronometro                                
                                limpaCronometro();

                                // requisição que obtem os dados do motorista
                                $http({
                                    method: 'GET',
                                    url: 'https://amber-torch-3328.firebaseio.com/caronas/' + $scope.carona.id + '/motorista.json'

                                    // caso a requisição seja bem sucedida...
                                }).then(function successCallback(response) {

                                    // armazena os dados do motorista
                                    nomeMotorista = response.data.nome;
                                    telefoneMotorista = response.data.telefone;

                                    // pergunta se o solicitante deseja aceitar a carona oferecida
                                    var confirmPopup = $ionicPopup.confirm({
                                        title: 'Carona Oferecida',
                                        template: '<p>Deseja pegar carona com ' + nomeMotorista + '?</p>'
                                    });

                                    // resposta do solicitante
                                    confirmPopup.then(function (res) {

                                        // caso a resposta seja positiva...
                                        if (res) {

                                            // requisição que grava o status 'aceita' no banco de dados
                                            $http({
                                                method: 'PATCH',
                                                url: 'https://amber-torch-3328.firebaseio.com/caronas/' + $scope.carona.id + '.json',
                                                data: {
                                                    'status': 'aceita'
                                                }

                                                // caso a requisição seja bem sucedida...
                                            }).then(function successCallback(response) {

                                                // exibe o nome e o telefone do motorista
                                                var alertPopup = $ionicPopup.alert({
                                                    title: 'Telefone do Motorista',
                                                    template: '<p>' + nomeMotorista + '</p>' + '</br>' + '<p>' + telefoneMotorista + '</p>'
                                                });

                                                // caso a requisição falhe, exibe mensagem de erro
                                            }, function errorCallback(response) {

                                                var alertPopup = $ionicPopup.alert({
                                                    title: 'Erro',
                                                    template: 'Não foi possível aceitar a carona.'
                                                });
                                            });

                                            // caso a resposta seja negativa...
                                        } else {

                                            // requisição que grava o status 'recusada' no banco de dados
                                            // e remove os dados do motorista que ofereceu a carona
                                            $http({
                                                method: 'PATCH',
                                                url: 'https://amber-torch-3328.firebaseio.com/caronas/' + $scope.carona.id + '.json',
                                                data: {
                                                    'status': 'recusada',
                                                    'motorista': false
                                                }
                                            });
                                        }
                                    });
                                },
                                    // caso a requisição falhe, exibe mensagem de erro
                                    function errorCallback(response) {

                                        clearInterval(caronaInterval);

                                        var alertPopup = $ionicPopup.alert({
                                            title: 'Erro',
                                            template: 'Não foi possível obter os dados do motorista.'
                                        });
                                    });
                                break;

                            // se não houver resposta...
                            case null:

                                // interrompe o loop de requisições
                                clearInterval(caronaInterval);
                                break;

                            // comportamento padrão quando as requisições são feitas mas não há oferta de carona
                            default:

                                // se o contador de requisições for maior que o limite máximo ou quando o cronometro zerar...
                                if ((cronometroMinutos <= 0) && (cronometroSegundos <= 0)) {
                                    //reseta o cronometro
                                    limpaCronometro();
                                    
                                    // interrompe o loop de requisições
                                    clearInterval(caronaInterval);
                                    
                                    // volta a exibir o botão pedir carona
                                    $scope.carona.botaoPedirCarona = true;
                                    $scope.carona.botaoCancelarCarona = false;

                                    // requisição que remove o pedido de carona do banco de dados
                                    $http({
                                        method: 'DELETE',
                                        url: 'https://amber-torch-3328.firebaseio.com/caronas/' + $scope.carona.id + '.json'

                                        // caso a requisição seja bem sucedida...
                                    }).then(function successCallback(response) {                                       

                                        // informa o solicitante que o pedido de carona não foi atendido
                                        var alertPopup = $ionicPopup.alert({
                                            title: 'Tempo Esgotado',
                                            template: 'Seu pedido de carona foi cancelado.'
                                        });

                                        // caso a requisição falhe, exibe mensagem de erro
                                    }, function errorCallback(response) {
                                        
                                        var alertPopup = $ionicPopup.alert({
                                            title: 'Erro',
                                            template: 'Não foi possível acessar o servidor.'
                                        });
                                    });
                                }
                                else {
                                    // incrementa o contador de requisições
                                    caronaIntervalCounter++;
                                }
                                break;
                        }

                        // caso a requisição falhe, exibe mensagem de erro
                    }, function errorCallback(response) {
                        //reseta o cronometro                                          
                        limpaCronometro();

                        // interrompe o loop de requisições
                        clearInterval(caronaInterval);

                        // volta a exibir o botão pedir carona
                        $scope.carona.botaoPedirCarona = true;
                        $scope.carona.botaoCancelarCarona = false;

                        var alertPopup = $ionicPopup.alert({
                            title: 'Erro',
                            template: 'Não foi possível acessar o servidor.'
                        });
                    });

                    // intervalo das requisições ao banco de dados
                    // uma requisição a cada 2 segundos
                }, 2000);
            }
        };


        function AddZero(num) {
            return (num >= 0 && num < 10) ? "0" + num : num + "";
        }


        // AUTOCOMPLETE
        $scope.model = "";
        $scope.clickedValueModel = "";
        $scope.removedValueModel = "";
        $scope.bairros = [];
        var urlGet = FIREBASE_URL + 'bairros.json';

        // recupera e transforma os dados em um obj para leitura do autocomplete
        $http.get(urlGet).then(function (resp) {
            angular.forEach(resp.data, function (value, key) {
                angular.forEach(value, function (value2, key2) {
                    var bairro = {};
                    if (key == 'vilavelha') {
                        var bairroNome = value2 + " - Vila Velha";
                    } else if (key == 'vitoria') {
                        var bairroNome = value2 + " - Vitória";
                    } else {
                        var bairroNome = value2 + " - " + key;
                    }
                    var bairro = {
                        "nome": bairroNome,
                        "id": 0
                    };
                    $scope.bairros.push(bairro);
                });
            });

            // lista os dados no autocomplete
            $scope.getBairros = function (query) {
                if (query) {
                    return {
                        items: $scope.bairros
                    };
                }
                return { items: [] };
            };

        },
            function (err) {
                console.error('ERR', err);
            });

        // funções do autocomplete
        $scope.itemsClicked = function (callback) {
            $scope.clickedValueModel = callback;
        };
        $scope.itemsRemoved = function (callback) {
            $scope.removedValueModel = callback;
        };

        $scope.init();

    })


    .filter('inRange', function () {
        return function (items, itensSelecionados, campo) {
            var filtered = [];
            angular.forEach(items, function (item, index) {
                if (itensSelecionados.indexOf(item[campo]) >= 0) {
                    filtered.push(item);
                }
            });

            if (itensSelecionados.length == 0) {
                for (var key in items) {
                    filtered.push(items[key]);
                }
            }

            return filtered;
        }
    })

    // controller da tela oferecer carona
    .controller('oferecerCaronaCtrl', function ($scope,
        $rootScope,
        $state,
        $firebase,
        $http,
        $ionicPopup,
        $timeout,
        $ionicSideMenuDelegate,
        $firebaseArray,
        AuthService) {

        // url do banco de dados
        var FIREBASE_URL = "https://amber-torch-3328.firebaseio.com/";

        //busca os dados do usuário logado
        var usuarioLogado = AuthService.usuarioLogado();

        // função que inicia o controlller
        $scope.ini = function () {

            // cria os vetores de bairros
            $scope.bairrosSelecionados = [];
            $scope.bairros = [];

            // obtem a lista de bairros
            var urlGet = FIREBASE_URL + 'bairros/vilavelha.json';

            $http.get(urlGet).then(function (resp) {

                for (var key in resp.data) {
                    var aux = { nome: resp.data[key] };

                    $scope.bairros.push(aux);
                }

            },
                function (err) {
                    console.error('ERR', err);
                });

        }

        // função da aba de menu da esquerda
        $scope.toggleLeft = function () {

            $ionicSideMenuDelegate.toggleLeft();
        };

        // funcão que insere os bairros selecionados
        $scope.selectBairro = function (nome, checked) {
            if (checked) {
                $scope.bairrosSelecionados.push(nome);
            } else {
                $scope.bairrosSelecionados.splice($scope.bairrosSelecionados.indexOf(nome), 1);
            }
        }

        // lista de pedidos de carona
        $scope.listarPedidosCarona = function () {

            // consulta para obter os usuários que pediram carona
            var urlGet = FIREBASE_URL + 'caronas.json?orderBy="status"&equalTo="pendente"';
            $scope.pedidos = [];

            $http.get(urlGet).then(function (resp) {
                for (var key in resp.data) {
                    var aux = resp.data[key];
                    aux.id = key;

                    $scope.pedidos.push(aux);

                }
            },
                function (err) {
                    console.error('ERR', err);
                });

        }

        $scope.ini();

        // função oferecer carona
        // parâmetro: pedido de carona selecionado
        $scope.oferecerCarona = function (pedido) {

            // exibe as informações do pedido de carona
            var confirmPopup = $ionicPopup.confirm({
                title: 'Oferecer Carona',
                template: '<p><i class="icon ion-man"></i> ' + pedido.vagas + ' &nbsp&nbsp ' + pedido.solicitante.nome + '</p></br><p>' + pedido.origem.bairro + ' <i class="icon ion-arrow-right-c"></i> ' + pedido.destino.bairro + '</p>'
            });

            // resposta do motorista
            confirmPopup.then(function (res) {

                // caso a resposta seja positiva...
                if (res) {

                    // requisição que adiciona os dados do motorista ao pedido de carona
                    $http({
                        method: 'PATCH',
                        url: 'https://amber-torch-3328.firebaseio.com/caronas/' + pedido.id + '.json',
                        data: {
                            'status': 'oferecida',
                            'motorista': {
                                'matricula': usuarioLogado.matricula,
                                'nome': usuarioLogado.nome,
                                'telefone': usuarioLogado.telefone
                            }
                        }

                        // caso a requisição seja bem sucedida...
                    }).then(function successCallback(response) {

                        // informa que a carona foi oferecida
                        var alertPopup = $ionicPopup.alert({
                            title: 'Carona Oferecida',
                            template: 'Aguarde a resposta do solicitante.'
                        });
                    },
                        // caso a requisição falhe, exibe mensagem de erro
                        function errorCallback(response) {
                            var alertPopup = $ionicPopup.alert({
                                title: 'Erro',
                                template: 'Não foi possível oferecer carona.'
                            });
                        });

                    // contador de requisições
                    var caronaIntervalCounter = 0;

                    // a cada 10 segundos, uma nova requisição é gerada
                    // objetivo: verificar se a carona oferecida foi aceita pelo solicitante
                    // há um contador que interrompe o loop após X requisições
                    var caronaInterval = setInterval(function () {

                        // requisição que verifica o status da carona no banco de dados
                        // status
                        // pendente: o pedido de carona foi criado no banco de dados
                        // oferecida: algum motorista viu o pedido e ofereceu carona
                        // aceita: o solicitante aceitou a carona oferecida
                        // recusada: o solicitante recusou a carona oferecida
                        $http({

                            method: 'GET',
                            url: 'https://amber-torch-3328.firebaseio.com/caronas/' + pedido.id + '/status.json'

                            // caso a requisição seja bem sucedida...
                        }).then(function successCallback(response) {

                            switch (response.data) {
                                case 'aceita':

                                    // interrompe o loop de requisições
                                    clearInterval(caronaInterval);

                                    // informa que a carona foi aceita pelo solicitante
                                    // exibe as informações do solicitante
                                    var alertPopup = $ionicPopup.alert({
                                        title: 'Carona Aceita',
                                        template: '<p>' + pedido.solicitante.nome + '</p>' + '</br>' + '<p>' + pedido.solicitante.telefone + '</p>'
                                    });

                                    // atualiza a lista de pedidos de carona
                                    $scope.listarPedidosCarona();
                                    break;

                                case 'recusada':

                                    // interrompe o loop de requisições
                                    clearInterval(caronaInterval);

                                    // requisição que remove o pedido de carona do banco de dados
                                    $http({
                                        method: 'DELETE',
                                        url: 'https://amber-torch-3328.firebaseio.com/caronas/' + pedido.id + '.json'

                                        // caso a requisição seja bem sucedida...
                                    }).then(function successCallback(response) {

                                        // informa que o solicitante recusou a carona
                                        var alertPopup = $ionicPopup.alert({
                                            title: pedido.solicitante.nome + ' recusou a carona.',
                                        });

                                        // atualiza a lista de pedidos de carona
                                        $scope.listarPedidosCarona();
                                    },

                                        // caso a requisição falhe, exibe mensagem de erro
                                        function errorCallback(response) {
                                            var alertPopup = $ionicPopup.alert({
                                                title: 'Erro',
                                                template: 'Não foi possível acessar o servidor.'
                                            });
                                        });
                                    break;

                                // se não houver resposta...
                                case null:

                                    // interrompe o loop de requisições
                                    clearInterval(caronaInterval);
                                    break;

                                // comportamento padrão quando as requisições são feitas mas não há resposta do solicitante
                                default:

                                    // se o contador de requisições for maior que o limite máximo...
                                    if (caronaIntervalCounter > 4) {

                                        // interrompe o loop de requisições
                                        clearInterval(caronaInterval);

                                        // requisição que altera o status do pedido de carona
                                        // e remove as informações do motorista
                                        $http({
                                            method: 'PATCH',
                                            url: 'https://amber-torch-3328.firebaseio.com/caronas/' + pedido.id + '.json',
                                            data: {
                                                'status': 'pendente',
                                                'motorista': false
                                            }

                                            // caso a requisição seja bem sucedida...
                                        }).then(function successCallback(response) {

                                            // informa que não houve resposta do solicitante
                                            var alertPopup = $ionicPopup.alert({
                                                title: 'Tempo Expirado',
                                                template: 'Não houve resposta do solicitante.'
                                            });
                                        },

                                            // caso a requisição falhe, exibe mensagem de erro
                                            function errorCallback(response) {
                                                var alertPopup = $ionicPopup.alert({
                                                    title: 'Erro',
                                                    template: 'Não foi possível acessar o servidor.'
                                                });
                                            });
                                    }
                                    else {

                                        // incrementa o contador de requisições
                                        caronaIntervalCounter++;
                                    }
                                    break;
                            }

                            // caso a requisição falhe, exibe mensagem de erro
                        }, function errorCallback(response) {

                            // interrompe o loop de requisições
                            clearInterval(caronaInterval);

                            var alertPopup = $ionicPopup.alert({
                                title: 'Erro',
                                template: 'Não foi possível acessar o servidor.'
                            });
                        });

                        // intervalo das requisições ao banco de dados
                        // uma requisição a cada 10 segundos
                    }, 10000);
                }
            });

        }
    })


    // cadastro
    .controller('cadastroCtrl', function ($scope, $stateParams, $firebase, $location, $state, $http, $ionicPopup, AuthService) {

        // dados de cadastro
        $scope.data = {
            nome: '',
            matricula: '',
            senha: '',
            email: '',
            telefone: '',
            cidade: '',
            bairro: '',
            endereco: '',
            pontoreferencia: '',
            carro: '',
            corcarro: ''
        };

        // url do banco de dados
        var FIREBASE_URL = "https://amber-torch-3328.firebaseio.com/";

        // obtem lista de usuarios do bando de dados
        var repUsuarios = new Firebase(FIREBASE_URL + "usuarios");

        // query que verifica uma informacao do usuarios
        var URL_GET_USUARIO = FIREBASE_URL + 'usuarios/{0}.json';
        //$scope.usuarios = $firebase(repUsuarios).$asArray();

        $scope.existeUsuarioCadastrado = function () {
            //  console.log('entrou na verificacao de uusario cadastrado.')
        };

        // funcao que valida os dados de cadastro
        $scope.criarNovo = function (e) {

            // requisicao que verifica se a matricula informada já existe no banco de dados
            $http({
                method: 'GET',
                url: URL_GET_USUARIO.replace('{0}', $scope.data.matricula),
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            })
                // caso a requisição seja bem sucedida...
                .success(function (data) {

                    // validação dos dados de cadastro 
                    if (data != null && data.senha != '') {
                        var alertPopup = $ionicPopup.alert({
                            title: 'Erro',
                            template: 'A matrícula informada já foi cadastrada.'
                        });
                    } else {

                        // cadastra usuário no banco de dados
                        $scope.criarUsuario();

                        var alertPopup = $ionicPopup.alert({
                            title: 'Cadastro Concluído',
                            template: 'Seu cadastro foi realizado com sucesso!'
                        });
                        $state.go('app.login');
                    }

                    // caso a requisição falhe, exibe mensagem de erro
                }).error(function (data) {
                    var alertPopup = $ionicPopup.alert({
                        title: 'Erro',
                        template: 'Não foi possível validar os dados de cadastro.'
                    });
                });

        };

        // função que cria um novo usuário no banco de dados com as informações de cadastro
        $scope.criarUsuario = function () {

            // obtem o novo usuario cadastrado
            var repUsuarios = new Firebase(FIREBASE_URL + "usuarios/" + $scope.data.matricula);

            // define os dados de cadastro
            repUsuarios.set({
                matricula: $scope.data.matricula,
                senha: $scope.data.senha,
                bloqueado: false,
                nome: $scope.data.nome,
                email: $scope.data.email,
                telefone: $scope.data.telefone,
                cidade: $scope.data.cidade,
                bairro: $scope.data.bairro,
                endereco: $scope.data.endereco,
                pontoreferencia: $scope.data.pontoreferencia,
                carro: $scope.data.carro,
                corcarro: $scope.data.corcarro
            });

            // limpa os campos de cadastro
            $scope.limparObjetoUsuario();

        };

        // função que limpa os dados de cadastro
        $scope.limparObjetoUsuario = function () {
            $scope.data.matricula = '';
            $scope.data.senha = '';
            $scope.data.nome = '';
            $scope.data.senha = '';
            $scope.data.email = '';
            $scope.data.telefone = '';
            $scope.data.cidade = '';
            $scope.data.bairro = '';
            $scope.data.endereco = '';
            $scope.data.pontoreferencia = '';
            $scope.data.carro = '';
            $scope.data.corcarro = '';

        };
    
    //obtem o cadastro do usuario logado
        $scope.carregarDadosCadastro = function (e) {    
            $http({
                method: 'GET',
                url: URL_GET_USUARIO.replace('{0}', AuthService.matricula()),
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            }).then(function (resp){                
                $scope.data.matricula = resp.data.matricula;
                $scope.data.senha = resp.data.senha;
                $scope.data.nome = resp.data.nome;
                $scope.data.email = resp.data.email;
                $scope.data.telefone = resp.data.telefone;
                $scope.data.cidade = resp.data.cidade;
                $scope.data.bairro = resp.data.bairro;
                $scope.data.endereco = resp.data.endereco;
                $scope.data.pontoreferencia = resp.data.pontoreferencia;
                $scope.data.carro = resp.data.carro;
                $scope.data.corcarro = resp.data.corcarro;
            }, function (err) {
                    var alertPopup = $ionicPopup.alert({
                    title: 'Erro',
                    template: 'Não foi possível validar os dados de cadastro.'
                    });
               console.error('ERR', err);
            });
        };
        
        $scope.alterarCadastro = function () {
           
           var repUsuarios = new Firebase(FIREBASE_URL + "usuarios/" + AuthService.matricula());

            // define os dados de cadastro
            repUsuarios.set({
                matricula: AuthService.matricula(),
                senha: $scope.data.senha,
                bloqueado: false,
                nome: $scope.data.nome,
                email: $scope.data.email,
                telefone: $scope.data.telefone,
                cidade: $scope.data.cidade,
                bairro: $scope.data.bairro,
                endereco: $scope.data.endereco,
                pontoreferencia: $scope.data.pontoreferencia,
                carro: $scope.data.carro,
                corcarro: $scope.data.corcarro
            });
                var alertPopup = $ionicPopup.alert({
                    title: 'Cadastro Atualizado',
                    template: 'Suas alterações foram salvas com sucesso!'
                });
                $state.go('app.principal');
        };  
    })


    .controller('detalheCaronaCtrl', function ($scope, $stateParams) {

        $scope.getDetalhe = function () {
            console.log($stateParams);
        }

    })

    // filtro de ordenação por campo de data
    .filter('orderByCampo', function () {
        return function (items, campo) {
            var filtered = [];

            for (var key in items) {
                filtered.push(items[key]);
            }

            filtered.sort(function (a, b) {
                a = parseInt(a[campo]);
                b = parseInt(b[campo]);
                return a - b;
            });

            return filtered;
        }
    })

    // historico de caronas
    .controller('historicoCaronaCtrl', function ($scope, $http, $firebase, $firebaseArray, AuthService) {

        // url do banco de dados
        var FIREBASE_URL = "https://amber-torch-3328.firebaseio.com/";

        // recupera a matricula da autenticação do usuário
        var matricula = AuthService.matricula();

        // função inicial do controller
        $scope.ini = function () {
            $scope.historico = [];

            // url para buscar o historico de carona
            var urlGet = FIREBASE_URL + 'caronas.json?orderBy="status"&equalTo="aceita"';

            $http.get(urlGet).then(function (resp) {

                // transforma o objeto recebido como resultado em um array dentro do escopo
                for (var key in resp.data) {
                    var aux = resp.data[key];

                    if ((aux.motorista.matricula == matricula) || (aux.solicitante.matricula == matricula)) {
                        aux.mostrarDetalhe = false;
                        $scope.historico.push(aux);
                    }
                }

                $scope.historico.sort(compararData);
            },
                function (err) {
                    console.error('ERR', err);
                });

        }

        // funcao pra ordenar o vetor pela data em ordem decrescente
        function compararData(a, b) {
            if (a.dateTime < b.dateTime) {
                return 1;
            } else if (a.dateTime > b.dateTime) {
                return -1;
            }
            else {
                return 0;
            }

        }

        $scope.ini();

    });