
var ImgApp = angular.module('image_app', [
    'akoenig.deckgrid',
    'ngFileUpload',
]);

ImgApp.config(function($locationProvider) {
/*
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
*/
});

var listLabels = function($http) {
    $http({
        url: '/api/v1/label',
        method: 'GET',
    }).then(function success(response) {
        console.log('list labels.response: ' + JSON.stringify(response));

        angular.forEach(response.data, function(element, index) {
            console.log('label: ' + element.value)
        });

    }, function error(data) {
        console.log(data);
        console.log('error returned!');
    });
}

var listImages = function($rootScope, $http) {
    $http({
        url: '/api/v1/image',
        method: 'GET',
    }).then(function success(response) {
        console.log('list images.response: ' + JSON.stringify(response));

        // temp code.
        angular.forEach(response.data, function(element, index) {
            console.log('url: ' + element.file)
            $rootScope.photos.push({'id': element.id, 'src': element.file});
        });

    }, function error(data) {
        console.log(data);
        console.log('error returned!');
    });
}

ImgApp.run(function($rootScope, $http) {

    $rootScope.loggedin = false;

    $rootScope.photos = [];

    console.log('scope length: ' + $rootScope.photos.length)

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
            localStorage.setItem('user', JSON.stringify(user));
        }
    }

    /* XXX: wrap in try/catch */
    $rootScope.setToken(localStorage.getItem('token'));
    $rootScope.setUser(JSON.parse(localStorage.getItem('user')));

    /* test the user's credentials. */
    if ($rootScope.token && $rootScope.user) {
        var id = $rootScope.user.id;

        console.log('user: ' + JSON.stringify($rootScope.user));
        console.log('id: ' + id);

        $http({
            url: '/api/v1/user/' + id,
            method: 'GET',
        }).then(function success(response) {
            console.log('response: ' + JSON.stringify(response));

            $rootScope.loggedin = true;

            // they loaded logged in, so let's load everything to start with.
            listLabels($http);
            listImages($rootScope, $http);

        }, function error(data) {
            console.log(data);
            console.log('error returned!');
        });
    }
});

ImgApp.controller('loginCtrl', function($rootScope, $scope, $http) {

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
            console.log('response: ' + JSON.stringify(response));

            $rootScope.loggedin = true;
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

ImgApp.controller('photoCtrl', ['$rootScope', '$scope', '$http', 'Upload', function($rootScope, $scope, $http, Upload) {

    $scope.createlbl = function() {
        $http({
            url: 'api/v1/label',
            method: 'POST',
            data: {value: $scope.newLabel}
        }).then(function success(resp) {
            console.log('successfully created label: ' + JSON.stringify(resp.data));
        }, function error(resp) {
            console.log('failed to create label: ' + JSON.stringify(resp.data));
        });
    }

    // upload on file select or drop
    $scope.upload = function(file) {
        if (!file) {
            return false;
        }

        Upload.upload({
            url: 'api/v1/image',
            data: {file: file}
        }).then(function(resp) {
            console.log('Success ' + resp.config.data.file.name + ' uploaded. Response: ' + JSON.stringify(resp.data));
        }, function(resp) {
            console.log('Error status: ' + resp.status);
        }, function(evt) {
            var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
            console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
        });
    };

    // for multiple files:
    $scope.uploadFiles = function(files) {
        if (files && files.length) {
            for (var i = 0; i < files.length; i++) {
                Upload.upload({
                    url: 'api/v1/image',
                    data: {file: files[i]}
                }).then(function(resp) {
                    console.log('Success ' + resp.config.data.file.name + 'uploaded. Response: ' + resp.data);
                }, function(resp) {
                    console.log('Error status: ' + resp.status);
                }, function(evt) {
                    var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                    console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
                });
            }
        }
    }
}]);

//https://richardtier.com/2014/03/15/authenticate-using-django-rest-framework-endpoint-and-angularjs/
//https://github.com/akoenig/angular-deckgrid


