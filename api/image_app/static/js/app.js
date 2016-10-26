
var ImgApp = angular.module('image_app', [
    'akoenig.deckgrid',
    'ngFileUpload',
    'ngCookies',
]);

ImgApp.config(function($locationProvider) {
/*
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
*/
});

var listLabels = function($scope, $http) {
    $http({
        url: '/api/v1/label',
        method: 'GET',
    }).then(function success(response) {
        console.log('list labels.response: ' + JSON.stringify(response));

        angular.forEach(response.data, function(element, index) {
            console.log('label: ' + element.value);

            $scope.addLabel(element.value, element.id);
        });

    }, function error(data) {
        console.log(data);
        console.log('error returned!');
    });
}

var listImages = function($scope, $http) {
    $http({
        url: '/api/v1/image',
        method: 'GET',
    }).then(function success(response) {
        console.log('list images.response: ' + JSON.stringify(response));

        // temp code.
        angular.forEach(response.data, function(element, index) {
            $scope.addImage(element.id, element.file, element.labels);
        });

    }, function error(data) {
        console.log(data);
        console.log('error returned!');
    });
}

var filterImages = function($scope, $http) {
    $http({
        url: '/api/v1/image',
        method: 'GET',
        params: {labels: $scope.selected},
    }).then(function success(response) {
        console.log('list images.response: ' + JSON.stringify(response));

        // temp code.
        angular.forEach(response.data, function(element, index) {
            $scope.addImage(element.id, element.file, element.labels);
        });

    }, function error(data) {
        console.log(data);
        console.log('error returned!');
    });
}

var addLabelToImage = function($scope, $http, image_id, label_id) {
    /* can I update the image in the photos directly? */

    console.log('image_id: ' + image_id + ' label_id: ' + label_id);

    /* return the promise. */
    return $http({
        url: '/api/v1/image/' + image_id + '/label/' + label_id,
        method: 'PUT',
    });

    /*
    then(function success(response) {
        console.log('image+label response: ' + JSON.stringify(response));
        // temp code.
        for (var i = 0; i < $scope.photos.length; i++) {
            if ($scope.photos[i].id == image_id) {
                $scope.photos[i].labels = [];
                $scope.photos[i].labels = response.data.labels;
                break;
            }
        }
    }, function error(data) {
        console.log(data);
        console.log('error returned!');
    });
    */
}

var createNewLabel = function($scope, $http, label) {
    $http({
        url: 'api/v1/label',
        method: 'POST',
        data: {value: label}
    }).then(function success(resp) {
        console.log('successfully created label: ' + JSON.stringify(resp.data));

        $scope.addLabel(resp.data.value, resp.data.id);

    }, function error(resp) {
        console.log('failed to create label: ' + JSON.stringify(resp.data));
    });
}

var loggedinInit = function($scope, $http) {
    jQuery('#loginformarea').slideUp();

    // they loaded logged in, so let's load everything to start with.
    listLabels($scope, $http);
    listImages($scope, $http);
}

ImgApp.run(function($rootScope, $http) {

    $rootScope.loggedin = false;

    $rootScope.photos = [];
    $rootScope.labelLookup = {};
    $rootScope.labels = [];
    $rootScope.selected = []; // used for filtering the images.
    $rootScope.downloadSelection = {};

    $rootScope.addLabel = function(label, id) {
        $rootScope.labels.push(label);
        $rootScope.labelLookup[label] = id;
    }

    $rootScope.addImage = function(id, src, labels) {
        $rootScope.photos.push({'id': id, 'src': src, 'labels': labels})
    }

    $rootScope.addFilter = function(filter) {
        $rootScope.selected.push(filter); // add to selection.
        for (var i = 0; i < $rootScope.labels.length; i++) {
            if ($rootScope.labels[i] === filter) {
                $rootScope.labels.splice(i, 1);
                break;
            }
        }

        /* this isn't the most efficient. */
        $rootScope.photos = [];
        filterImages($rootScope, $http);
    }

    $rootScope.delFilter = function(filter) {
        $rootScope.labels.push(filter); // add to selection.
        for (var i = 0; i < $rootScope.selected.length; i++) {
            if ($rootScope.selected[i] === filter) {
                $rootScope.selected.splice(i, 1);
                break;
            }
        }

        /* this isn't the most efficient. */
        $rootScope.photos = [];
        filterImages($rootScope, $http);
    }

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

    /* Test the user's credentials and initialize the lists. */
    if ($rootScope.token && $rootScope.user) {
        var id = $rootScope.user.id;

        $http({
            url: '/api/v1/user/' + id,
            method: 'GET',
        }).then(function success(response) {
            console.log('response: ' + JSON.stringify(response));

            $rootScope.loggedin = true;

            loggedinInit($rootScope, $http);
        }, function error(data) {
            console.log(data);
            console.log('error returned!');
        });
    }
});

ImgApp.controller('subordinate', ['$rootScope', '$scope', '$http', '$q', function($rootScope, $scope, $http, $q) {

    $scope.linkLabel = function(e) {
        var image_id = jQuery(e.target).attr('id');
        console.log('clicked: ' + image_id);

        var $input = jQuery('#input_' + image_id);
        var label = $input.val();
        $input.val('');

        console.log('label ' + label + ' ' + ' image id: ' + image_id);

        /* XXX: after the loops are finished, I should call retrieve on the image once. */
        if (label && label.length > 0) {
            labels = label.split(',');
            var promises = [];

            console.log('labels: ' + JSON.stringify(labels));

            for (var i = 0; i < labels.length; i++) {
                var ll = labels[i].trim();
                console.log('ll: ' + ll);

                if ($rootScope.labelLookup[ll] == undefined) {
                    console.log('brand new label!');
                } else {
                    console.log('not a brand new label');
                    //(function() {
                        var ll2 = ll;
                        var id2 = $rootScope.labelLookup[ll2];
                        console.log('ll2: ' + ll2 + ' id2: ' + id2)
                        promises.push(addLabelToImage($rootScope, $http, image_id, id2));
                    //});
                }
            }

            console.log('waiting on promises: ' + promises.length)

            $q.all(promises);

            /* wait for the promises to run. */
            $http({
                url: '/api/v1/image/' + image_id,
                method: 'GET',
            }).then(function success(response) {
                console.log('image+label response: ' + JSON.stringify(response));
                for (var i = 0; i < $rootScope.photos.length; i++) {
                    if ($rootScope.photos[i].id == image_id) {
                        $rootScope.photos[i].labels = [];
                        $rootScope.photos[i].labels = response.data.labels;
                        break;
                    }
                }
            }, function error(response) {
                console.log('error on getting the image back');
            });
        }
    }

    $scope.selectForDownload = function(e) {
        var id = jQuery(e.target).attr('id').replace('select_', '');
        console.log('selected for download: ' + id);

        if ($rootScope.downloadSelection[id] == undefined) {
            $rootScope.downloadSelection[id] = 1;
        } else {
            delete $rootScope.downloadSelection[id];
        }
    }
}]);

ImgApp.controller('photoCtrl', ['$rootScope', '$scope', '$http', '$location', '$window', 'Upload', function($rootScope, $scope, $http, $location, $window, Upload) {

    $scope.createLabel = function() {
        $http({
            url: 'api/v1/label',
            method: 'POST',
            data: {value: $scope.newLabel}
        }).then(function success(resp) {
            console.log('successfully created label: ' + JSON.stringify(resp.data));

            $scope.addLabel(resp.data.value, resp.data.id);

        }, function error(resp) {
            console.log('failed to create label: ' + JSON.stringify(resp.data));
        });
    }

    $scope.selectLabel = function(e) {
        console.log('clicked', $(e.target).text());
        var filter = $(e.target).text();
        $scope.addFilter(filter);
    }

    $scope.deselectLabel = function(e) {
        console.log('clicked', $(e.target).text());
        var filter = $(e.target).text();
        $scope.delFilter(filter);
    }

    $scope.download = function() {
        files = Object.keys($scope.downloadSelection);
        if (files.length > 0) {
            var path = $location.protocol() + '://' + $location.host() + ':' + $location.port() + '/api/v1/download';

            // using jQuery.param doesn't work against the drf.
            arguments = [];
            for (var i = 0; i < files.length; i++) {
                arguments.push('images=' + files[i]);
            }

            path += '?' + arguments.join("&");

            console.log('path: ' + path);
            $window.open(path, '_blank');
        }
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
            /* XXX: There's no guarantee the image would show up given the filter of selected. */
            /* XXX: Since you can't upload an image with labels... if any are selected, this can't show up. */
            $scope.addImage(resp.data.id, resp.data.file, resp.data.labels);
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

ImgApp.controller('loginCtrl', ['$rootScope', '$scope', '$http', '$cookies', function($rootScope, $scope, $http, $cookies) {

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

            $http({
                url: '/api/v1/user/1/secondarylogin',
                method: 'POST',
                data: {
                    username: u,
                    password: p
                },
                /*
                headers: {
                    'X-CSRFToken': $cookies.get('csrftoken')
                },
                */
            }).then(function success(response) {
                console.log('logged in successfully!');

                loggedinInit($rootScope, $http);
            }, function error(data) {
                console.log('failed to login');
            });
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
}]);

//https://richardtier.com/2014/03/15/authenticate-using-django-rest-framework-endpoint-and-angularjs/
//https://github.com/akoenig/angular-deckgrid


