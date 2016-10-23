
var ImgApp = angular.module('image_app', [
    'akoenig.deckgrid',
    'lr.upload'
]);

ImgApp.run(function ($rootScope, $http) {

    $rootScope.setToken = function(token) {
        if (token) {
            $rootScope.token = token;
            localStorage.setItem('token', token);
            $http.defaults.headers.common['Authorization'] = "Token " + token;
        }
    };

    $rootScope.clearAuth = function() {
        delete $rootScope.token;
        localStorage.removeItem('token');
        delete $http.defaults.headers.common['Authorization'];

        delete $rootScope.user;
        localStorage.removeItem('user');
    }

    $rootScope.setUser = function(user) {
        if (user) {
            $rootScope.user = user;
            localStorage.setItem('user', user);
        }
    }

    $rootScope.setToken(localStorage.getItem('token'));
    $rootScope.setUser(localStorage.getItem('user'));
});

ImgApp.controller('loginCtrl', function ($rootScope, $scope, $http) {

    function b64EncodeUnicode(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
    }

    $scope.login = function() {
        var u = $scope.username;
        var p = $scope.password;

        console.log('login with: ' + u + ', password: ' + p);

        $http({
            url: '/auth/login/',
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + b64EncodeUnicode(u + ':' + p)
            }
        }).then(function success(response) {
            console.log('Logged in!', new Date());
            $rootScope.setUser(response.data.user);
            $rootScope.setToken(response.data.token);
        }, function error(data) {
            console.log(data);
            console.log('error returned!');
        });
    }

    $scope.logout = function() {
        $http({
            url: '/auth/logout/',
            method: 'POST'
        }).then(function success(res) {
            console.log(['successfully logged out', res]);
            //$rootScope.loginEvaluated = false;
            $rootScope.clearAuth();
        }, function error(res) {
            console.log(['failed to log out', res]);
        });
    }
});

ImgApp.controller('photoCtrl', function($scope) {
    $scope.photos = [
        {id: 'p1', 'title': 'A nice day!', src: "http://lorempixel.com/300/400/"},
        {id: 'p2', 'title': 'Puh!', src: "http://lorempixel.com/300/400/sports"},
        {id: 'p3', 'title': 'What a club!', src: "http://lorempixel.com/300/400/nightlife"}
    ];
});

ImgApp.controller('uploadCtrl', function($scope, upload) {
    $scope.doUpload = function() {
        upload({
            url: '/api/v1/image',
            method: 'POST',
            data: {
                file: $scope.myFile, // a jqLite type="file" element, upload() will extract all the files from the input and put them into the FormData object before sending.
            }
        }).then(
            function(response) {
                console.log(response.data); // will output whatever you choose to return from the server on a successful upload
            },
            function(response) {
                console.error(response); //  Will return if status code is above 200 and lower than 300, same as $http
            }
        );
    }
});

//https://richardtier.com/2014/03/15/authenticate-using-django-rest-framework-endpoint-and-angularjs/
//https://github.com/akoenig/angular-deckgrid


