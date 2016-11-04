
var ImgApp = angular.module('image_app', [
    'akoenig.deckgrid',
    'ngFileUpload',
    'ngCookies',
    'sticky'
]);

ImgApp.config(function($locationProvider) {
/*
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
*/
});

/* XXX: Define all of the following into resources. */

/* the following hack is to force uploads of images to be serial in nature, which
 * is obviously a performance hit, but with the sqlite3 backend... it couldn't handle
 * real use and I don't feel like going through setting up postgres or something like it
 * just for this.
 */
var uploadImage = function(Upload, $scope) {
    var f = $scope.uploadQueue.shift();
    if (!f) {
        jQuery('#barContainer').fadeOut();
        return;
    }

    Upload.upload({
        url: 'api/v1/image',
        data: {file: f}
    }).then(function(resp) {
        console.log('Success ' + resp.config.data.file.name + 'uploaded. Response: ' + resp.data);
        $scope.addImage(resp.data.id, resp.data.thumbnail, resp.data.labels);
        $scope.progressBar = 0;

        return uploadImage(Upload, $scope);

    }, function(resp) {
        console.log('Error status: ' + resp.status);
        $scope.progressBar = 0;
    }, function(evt) {
        var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
        console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
        $scope.progressBar = progressPercentage;
    });
}

/* the following hack is to force sequential adding of labels, followed by updating the whole image.
 */
var addLabels = function($scope, $http, labels, index, image_id) {

    /* we know addLabels is called with at least one entry in labels, and index starting at 0, so if the
     * index equals the length we've processed them all.
     */
    if (index == labels.length) {
        $http({
            url: '/api/v1/image/' + image_id,
            method: 'GET',
        }).then(function success(response) {
            console.log('image+label response: ' + JSON.stringify(response));
            for (var i = 0; i < $scope.photos.length; i++) {
                if ($scope.photos[i].id == image_id) {
                    $scope.photos[i].labels = [];
                    $scope.photos[i].labels = response.data.labels;
                    break;
                }
            }
        }, function error(response) {
            console.log('error on getting the image back');
        });

        /* don't go below. */
        return;
    }

    /* if this label is entirely new, create then attach it, otherwise just attach it. */
    var ll = labels[index];

    if ($scope.labelLookup[ll] == undefined) {
        $http({
            url: 'api/v1/label',
            method: 'POST',
            data: {value: ll}
        }).then(function success(resp) {
            console.log('successfully created label: ' + JSON.stringify(resp.data));

            $scope.addLabel(resp.data.value, resp.data.id);
            var label_id = resp.data.id;

            $http({
                url: '/api/v1/image/' + image_id + '/label/' + label_id,
                method: 'PUT',
            }).then(function success(response) {

                /* we've created the label and now added it to our image; move forward */
                addLabels($scope, $http, labels, index + 1, image_id);

            }, function error(resp) {
                console.log('failed to add label to image: ' + JSON.stringify(resp.data));
            });
        }, function error(resp) {
            console.log('failed to create label: ' + JSON.stringify(resp.data));
        });
    } else {
        label_id = $scope.labelLookup[ll];

        $http({
            url: '/api/v1/image/' + image_id + '/label/' + label_id,
            method: 'PUT',
        }).then(function success(resp) {
            /* we've added it to our image; move forward */
            addLabels($scope, $http, labels, index + 1, image_id);
        });
    }
}

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

var listUnlabeled = function($scope, $http) {
    $http({
        url: '/api/v1/image',
        method: 'GET',
        params: {unlabeled: true},
    }).then(function success(response) {
        console.log('list images.response: ' + JSON.stringify(response));

        // temp code.
        angular.forEach(response.data, function(element, index) {
            $scope.addImage(element.id, element.thumbnail, element.labels);
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
            $scope.addImage(element.id, element.thumbnail, element.labels);
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
            $scope.addImage(element.id, element.thumbnail, element.labels);
        });

    }, function error(data) {
        console.log(data);
        console.log('error returned!');
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

    $rootScope.selected = []; // used for filtering the images.


    $rootScope.downloadSelection = {};
    $rootScope.downloadCount = 0;

    $rootScope.labelLookup = {};
    $rootScope.labels = [];

    $rootScope.uploadQueue = [];
    $rootScope.progressBar = 0;

    $rootScope.addLabel = function(label, id) {
        $rootScope.labels.push(label);
        $rootScope.labelLookup[label] = id;
    }

    $rootScope.addImage = function(id, src, labels) {
        $rootScope.photos.push({'id': id, 'src': src, 'labels': labels})
    }

    $rootScope.unlabeledFilter = function() {
        /* de-select all filters. */
        for (var i = 0; i < $rootScope.selected.length; i++) {
            $rootScope.labels.push($rootScope.selected[i]);
        }
        $rootScope.selected = [];

        $rootScope.photos = [];
        $rootScope.downloadSelection = {};
        listUnlabeled($rootScope, $http);
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
        $rootScope.downloadSelection = {};
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
        $rootScope.downloadSelection = {};
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

    jQuery('#barContainer').hide();
});

ImgApp.controller('subordinate', ['$rootScope', '$scope', '$http', '$q', function($rootScope, $scope, $http, $q) {

    $scope.linkLabel = function(e) {
        var image_id = jQuery(e.target).attr('id');
        console.log('clicked: ' + image_id);

        var $input = jQuery('#input_' + image_id);
        var label = $input.val();
        $input.val('');

        console.log('label ' + label + ' ' + ' image id: ' + image_id);

        if (label && label.length > 0) {
            labels = label.split(',');
            var labelsToAdd = [];

            console.log('labels: ' + JSON.stringify(labels));

            for (var i = 0; i < labels.length; i++) {
                var ll = labels[i].trim();
                console.log('ll: ' + ll);
                labelsToAdd.push(ll);
            }

            addLabels($rootScope, $http, labelsToAdd, 0, image_id);
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

        $rootScope.downloadCount = Object.keys($rootScope.downloadSelection).length;
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

    $scope.selectUnlabeled = function(e) {
        console.log('clicked unlabeled');
        $scope.unlabeledFilter();
        e.preventDefault();
        return false;
    }

    $scope.selectLabel = function(e) {
        console.log('clicked', $(e.target).text());
        var filter = $(e.target).text();
        $scope.addFilter(filter);
        e.preventDefault();
        return false;
    }

    $scope.deselectLabel = function(e) {
        console.log('clicked', $(e.target).text());
        var filter = $(e.target).text();
        $scope.delFilter(filter);
        e.preventDefault();
        return false;
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

    // for multiple files:
    $scope.uploadFiles = function(files) {
        if (files && files.length) {
            for (var i = 0; i < files.length; i++) {
                $scope.uploadQueue.push(files[i]);
            }

            jQuery('#barContainer').show();
            /* force synchronous uploads. */
            uploadImage(Upload, $scope);
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


