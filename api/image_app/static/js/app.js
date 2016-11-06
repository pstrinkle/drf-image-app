(function () {
    //'use strict';

    var ImgApp = angular.module('image_app', [
        'ngFileUpload',
        'ngCookies',
        'sticky',
        'ngSanitize',
        'ngMaterial'
    ]);

    ImgApp.config(function($locationProvider) {
    /*
        $locationProvider.html5Mode({
            enabled: true,
            requireBase: false
        });
    */
    });

    /* super basic version from http://www.codeducky.org/q-serial/
     * doesn't really handle failures at all!
     */
    var serial = function(tasks) {
        var prevPromise;
        angular.forEach(tasks, function(task) {
            //First task
            if (!prevPromise) {
                prevPromise = task();
            } else {
                prevPromise = prevPromise.then(task);
            }
        });
        return prevPromise;
    }

    var emptyDictionary = function(dictionary) {
        for (var member in dictionary) {
            delete dictionary[member];
        }
    }

    var openDownloadLink = function($window, $location, files) {

        if (files.length > 0) {
            var path = $location.protocol() + '://' + $location.host() + ':' + $location.port() + '/api/v1/download';

            // using jQuery.param doesn't work against the drf.
            var arguments = [];
            for (var i = 0; i < files.length; i++) {
                arguments.push('images=' + files[i]);
            }

            path += '?' + arguments.join("&");

            console.log('path: ' + path);
            $window.open(path, '_blank');
        }
    }

    /* XXX: Define all of the following into resources. */

    /* the following hack is to force sequential adding of labels, followed by updating the whole image.
     *
     * really this should use an array at a higher level of scope that has an action detail so that someone
     * can delete a label from an image while the system is still adding them, and it just keeps processing updates
     * until they're all done.
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

                        console.log('found photo pull after adding labels');
                        console.log('unlabeledSelected: ' + $scope.unlabeledSelected);

                        // if they're unlabeled filtering, hide this image now.
                        if ($scope.unlabeledSelected) {
                            $scope.photos.splice(i, 1);
                        } else {
                            $scope.photos[i].labels.length = 0;
                            $scope.photos[i].labels = response.data.labels;
                        }

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
                data: {
                    value: ll
                }
            }).then(function success(resp) {
                console.log('successfully created label: ' + JSON.stringify(resp.data));

                $scope.addLabel(resp.data.value, resp.data.id, resp.data.count);
               var label_id = resp.data.id;

                $http({
                    url: '/api/v1/image/' + image_id + '/label/' + label_id,
                    method: 'PUT',
                }).then(function success(response) {

                    $scope.labelCnts[ll] += 1;

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
                /* the label count should go up by 1 */
                $scope.labelCnts[ll] += 1;

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
                console.log('label: ' + element.value + ' id: ' + element.id);

                $scope.addLabel(element.value, element.id, element.count);
            });

        }, function error(data) {
            console.log(data);
            console.log('error returned!');
        });
    }

    var handleImages = function($scope, response) {

        $scope.photos.length = 0;
        emptyDictionary($scope.downloadSelection);
        $scope.downloadCount = 0;

        jQuery('#listProgress').show();

        console.log('total items: ' + response.data.count);

        //"next": "http://127.0.0.1:8000/api/v1/image?page=2",
        //"previous": null

        if (response.data.previous == null) {
            $scope.prevPageNum = 'n/a';
            $scope.currentPage = 1;
            if (response.data.next) {
                $scope.nextPageNum = 2;
            } else {
                $scope.nextPageNum = 'n/a';
            }
        } else {
            /* previous page isn't null, but we may be in the middle or the end. */

            /* previous page could be the 0th page, and then won't have the page parameter. */

            var prev = response.data.previous;
            var pieces = prev.split('?');
            if (pieces.length > 1) {
                /* labels and/or page specified */
                var params = pieces[1].split('&');
                var page = -1;

                angular.forEach(params, function(element, index) {
                    var these = element.split('=');
                    if (these[0] === 'page') {
                        page = parseInt(these[1]);
                    }
                });

                $scope.prevPageNum = page;
                $scope.currentPage = page + 1;
                if (response.data.next) {
                    $scope.nextPageNum = page + 2;
                } else {
                    $scope.nextPageNum = 'n/a';
                }
            } else {
                /* absolutely zero parameters; prev is the 1st page. */
                $scope.prevPageNum = 1;
                $scope.currentPage = 2;

                if (response.data.next) {
                    $scope.nextPageNum = 3;
                } else {
                    $scope.nextPageNum = 'n/a';
                }
            }
        }

        $scope.prevLink = response.data.previous;
        $scope.nextLink = response.data.next;

        // temp code.
        angular.forEach(response.data.results, function(element, index) {
            $scope.addImage(element.id, element.thumbnail, element.labels);
        });

        delete response.data.results;
        console.log('response elements: ' + JSON.stringify(response.data, null, 2));

        jQuery('#listProgress').hide();
    }

    var listUnlabeled = function($scope, $http) {
        $http({
            url: '/api/v1/image',
            method: 'GET',
            params: {unlabeled: true},
        }).then(function success(response) {
            console.log('list images.response: ' + JSON.stringify(response));

            handleImages($scope, response);

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
            //console.log('list images.response: ' + JSON.stringify(response));

            handleImages($scope, response);

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
            //console.log('list images.response: ' + JSON.stringify(response));

            handleImages($scope, response);

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
        $rootScope.prevPageNum = -1;
        $rootScope.currentPage = 0;
        $rootScope.nextPageNum = 1;
        $rootScope.prevLink = null;
        $rootScope.nextLink = null;

        $rootScope.unlabeledSelected = false;
        $rootScope.selected = []; // used for filtering the images.

        $rootScope.downloadSelection = {};
        $rootScope.downloadCount = 0;

        $rootScope.labelCnts = {};
        $rootScope.labelLookup = {};
        $rootScope.labels = [];
        $rootScope.multiLabel = "";

        $rootScope.uploadQueue = [];
        $rootScope.progressBar = 0;

        $rootScope.addLabel = function(label, id, cnt) {
            $rootScope.labels.push(label);
            $rootScope.labelLookup[label] = id;
            $rootScope.labelCnts[label] = cnt;
        }

        $rootScope.addImage = function(id, src, labels) {
            $rootScope.photos.push({'id': id,
                                    'src': src,
                                    'labels': labels})
        }

        $rootScope.unlabeledFilter = function() {
            /* de-select all filters. */
            for (var i = 0; i < $rootScope.selected.length; i++) {
                $rootScope.labels.push($rootScope.selected[i]);
            }
            $rootScope.selected.length = 0;

            $rootScope.photos.length = 0;
            emptyDictionary($rootScope.downloadSelection);
            $rootScope.downloadCount = 0;

            listUnlabeled($rootScope, $http);
        }

        $rootScope.allImagesFilter = function() {
            for (var i = 0; i < $rootScope.selected.length; i++) {
                $rootScope.labels.push($rootScope.selected[i]);
            }

            $rootScope.selected.length = 0;
            listImages($rootScope, $http);
        }

        $rootScope.addFilter = function(filter) {
            console.log('addFilter: ' + filter);
            $rootScope.selected.push(filter); // add to selection.
            for (var i = 0; i < $rootScope.labels.length; i++) {
                if ($rootScope.labels[i] === filter) {
                    $rootScope.labels.splice(i, 1);
                    break;
                }
            }

            /* this isn't the most efficient. */
            filterImages($rootScope, $http);
        }

        $rootScope.delFilter = function(filter) {
            console.log('delFilter: ' + filter);
            $rootScope.labels.push(filter); // add to selection.
            for (var i = 0; i < $rootScope.selected.length; i++) {
                if ($rootScope.selected[i] === filter) {
                    $rootScope.selected.splice(i, 1);
                    break;
                }
            }

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

        jQuery('#uploadtrackingContainer').hide();
    });

    ImgApp.controller('photoCtrl', ['$rootScope', '$scope', '$mdDialog', '$http', '$location', '$window', '$q', 'Upload',
                                    function($rootScope, $scope, $mdDialog, $http, $location, $window, $q, Upload) {

        function DialogController($scope, $mdDialog) {
            $scope.hide = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
                $mdDialog.cancel();
            };

            $scope.save = function() {
                var tasks = [];

                /* Walk through the list of items (not being deleted) and see if they've changed */
                for (var i = 0; i < $scope.labels.length; i++) {
                    var l = $scope.labels[i];
                    var lid = $scope.labelLookup[l];

                    var $inputField = jQuery('#edit_label_' + l);
                    var v = $inputField.val().trim();

                    if (l != v) {
                        console.log('label changed: was: ' + l + ' now: ' + v);

                        /* did they delete it? -- */
                        if ($scope.toDelete.indexOf(l) != -1) {
                            console.log('they deleted it');
                        } else {
                            var updateLabel = function() {
                                $http({
                                    url: '/api/v1/label/' + lid,
                                    method: 'PUT',
                                    data: {
                                        value: v,
                                    },
                                }).then(function success(response) {

                                    $rootScope.labelLookup[v] = $rootScope.labelLookup[l];
                                    $rootScope.labelCnts[v] = $rootScope.labelCnts[l];

                                    delete $rootScope.labelLookup[l];
                                    delete $rootScope.labelCnts[l];

                                    for (var k = 0; k < $rootScope.labels.length; k++) {
                                        if ($rootScope.labels[i] === l) {
                                            $rootScope.labels[i] = v;
                                            break;
                                        }
                                    }
                                    for (var j = 0; j < $rootScope.selected.length; j++) {
                                        if ($rootScope.selected[i] === l) {
                                            $rootScope.selected[i] = v;
                                            break;
                                        }
                                    }

                                    console.log('successfully renamed it');
                                }, function error(data) {
                                    console.log(data);
                                    console.log('error returned!');
                                });
                            }

                            tasks.push(updateLabel);
                        }
                    }
                }

                /* Walk through the list of items to delete, and delete them. */
                for (var i = 0; i < $scope.toDelete.length; i++) {
                    var l = $scope.toDelete[i];
                    var lid = $scope.labelLookup[l];

                    console.log('deleting label: ' + l + ' id: ' + lid);

                    var deleteLabel = function() {
                        console.log('deleting: ' + l);

                        $http({
                            url: '/api/v1/label/' + lid,
                            method: 'DELETE',
                        }).then(function success(response) {
                            console.log('del label.response: ' + JSON.stringify(response));
                            delete $rootScope.labelLookup[l];
                            delete $rootScope.labelCnts[l];

                            for (var k = 0; k < $rootScope.labels.length; k++) {
                                if ($rootScope.labels[i] === l) {
                                    $rootScope.labels.splice(i, 1);
                                    break;
                                }
                            }
                            for (var j = 0; j < $rootScope.selected.length; j++) {
                                if ($rootScope.selected[i] === l) {
                                    $rootScope.selected.splice(i, 1);
                                    break;
                                }
                            }
                        }, function error(data) {
                            console.log(data);
                            console.log('error returned!');
                        });
                    }

                    tasks.push(deleteLabel);
                }

                var hideThis = function() {
                    $mdDialog.hide();
                }

                tasks.push(hideThis);

                console.log('starting the actions');
                serial(tasks);
            }

            $scope.toDelete = [];

            $scope.del = function(label) {
                console.log('try deleting label: ' + label);
                $scope.toDelete.push(label);

                jQuery('#edit_label_' + label).css('text-decoration', 'line-through');
            }
        }

        $scope.showAdvanced = function(ev) {
            $mdDialog.show({
                controller: DialogController,
                templateUrl: 'dialog1.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose:true,
                fullscreen: false,
                scope: $scope,        // use parent scope in template
                preserveScope: true,  // do not forget this if use parent scope
            });
        };

        $scope.prevPage = function() {
            $http({
                url: $scope.prevLink,
            }).then(function success(response) {
                handleImages($rootScope, response);
            });
        }

        $scope.nextPage = function() {
            $http({
                url: $scope.nextLink,
            }).then(function success(response) {
                handleImages($rootScope, response);
            });
        }

        $scope.createLabel = function() {
            $http({
                url: 'api/v1/label',
                method: 'POST',
                data: {
                    value: $scope.newLabel
                }
            }).then(function success(resp) {
                console.log('successfully created label: ' + JSON.stringify(resp.data));

                $scope.addLabel(resp.data.value, resp.data.id, resp.data.count);

            }, function error(resp) {
                console.log('failed to create label: ' + JSON.stringify(resp.data));
            });
        }

        $scope.selectUnlabeled = function(e) {
            console.log('clicked unlabeled');

            var $p = $(e.target).parent();

            /* are they selecting or de-selecting? */
            if ($p.hasClass('active')) {
                $p.removeClass('active');
                $(e.target).blur();

                $scope.unlabeledSelected = false;
                $scope.allImagesFilter();
            } else {
                $p.addClass('active');

                $scope.unlabeledSelected = true;
                $scope.unlabeledFilter();
            }

            e.preventDefault();
            return false;
        }

        $scope.selectLabel = function(chip) {
            if ($scope.unlabeledSelected) {
                $scope.unlabeledSelected = false;
                jQuery('#unlabeledLi').removeClass('active');
            }

            /*
            if ($(e.target).hasClass('badge')) {
                text = $(e.target).parent().text();
            } else {
                text = $(e.target).text();
            }
            */

            var filter = chip.trim();
            console.log('filter: ' + filter);
            $scope.addFilter(filter);
        }

        $scope.deselectLabel = function(chip) {
            /*
            if ($(e.target).hasClass('badge')) {
                text = $(e.target).parent().text();
            } else {
                text = $(e.target).text();
            }

            var pieces = text.split(' ');
            pieces.pop();
            */

            var filter = chip.trim();

            console.log('filter: ' + filter);
            $scope.delFilter(filter);
        }

        $scope.applyLabelMultiplePhotos = function() {
            var selected = $scope.multiLabel;
            console.log('apply button clicked for: ' + selected);
        }

        $scope.download = function() {
            files = Object.keys($scope.downloadSelection);

            openDownloadLink($window, $location, files);
        }

        $scope.downloadAll = function() {
            var files = [];
            for (var i = 0; i < $scope.photos.length; i++) {
                files.push($scope.photos[i].id);
            }

            openDownloadLink($window, $location, files);
        }

        var closeUpload = function() {
            jQuery('#uploadtrackingContainer').fadeOut();
        }

        var uploadImageOnce = function() {
            var f = $scope.uploadQueue.shift();
            if (!f) {
                return null;
            }

            console.log('uploadImageOne called');

            return Upload.upload({
                url: 'api/v1/image',
                data: {file: f}
            }).then(function(resp) {
                console.log('Success ' + resp.config.data.file.name + ' uploaded. Response: ' + resp.data);
                $scope.addImage(resp.data.id, resp.data.thumbnail, resp.data.labels);
                $scope.progressBar = 0;
            }, function(resp) {
                console.log('Error status: ' + resp.status);
                $scope.progressBar = 0;
            }, function(evt) {
                var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                //console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
                $scope.progressBar = progressPercentage;
            });
        }

        // for multiple files:
        $scope.uploadFiles = function(files) {
            if (files && files.length) {
                var tasks = [];

                for (var i = 0; i < files.length; i++) {
                    $scope.uploadQueue.push(files[i]);
                    tasks.push(uploadImageOnce);
                }
                tasks.push(closeUpload);

                jQuery('#uploadtrackingContainer').show();
                console.log('starting tasks!');
                serial(tasks);
            }
        }

        $scope.removeLabel = function(chip, image_id) {
            console.log('new chip: ' + chip);
            console.log('clicked: ' + image_id);

            var label = chip;

            if (label && label.length > 0) {
                label_id = $scope.labelLookup[label];

                $http({
                    url: '/api/v1/image/' + image_id + '/label/' + label_id,
                    method: 'DELETE',
                }).then(function success(resp) {
                    /* the label count should go up by 1 */
                    $scope.labelCnts[label] -= 1;

                    /* we've added it to our image; move forward */
                    $http({
                        url: '/api/v1/image/' + image_id,
                        method: 'GET',
                    }).then(function success(response) {
                        console.log('image+label response: ' + JSON.stringify(response));
                        for (var i = 0; i < $scope.photos.length; i++) {
                            if ($scope.photos[i].id == image_id) {

                                console.log('found photo pull after adding labels');
                                console.log('unlabeledSelected: ' + $scope.unlabeledSelected);

                                // if they're unlabeled filtering, hide this image now.
                                if ($scope.unlabeledSelected) {
                                    $scope.photos.splice(i, 1);
                                } else {
                                    $scope.photos[i].labels.length = 0;
                                    $scope.photos[i].labels = response.data.labels;
                                }

                                break;
                            }
                        }
                    }, function error(response) {
                        console.log('error on getting the image back');
                    });
                });
            }
        }

        $scope.linkLabel = function(chip, image_id) {
            console.log('new chip: ' + chip);
            console.log('clicked: ' + image_id);

            var label = chip;

            if (label && label.length > 0) {
                //labels = label.split(',');
                var labelsToAdd = [];
                labelsToAdd.push(label);

                addLabels($rootScope, $http, labelsToAdd, 0, image_id);
            }
        }

        $rootScope.selectedItem = null;
        $rootScope.searchText = null;
        $rootScope.querySearch = querySearch;

        function querySearch (query) {
            var results = query ? $rootScope.labels.filter(createFilterFor(query)) : [];
            return results;
        }

        function createFilterFor(query) {
            var lowercaseQuery = angular.lowercase(query);

            return function filterFn(label) {
                return (label.indexOf(lowercaseQuery) === 0);
            };
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

    ImgApp.controller('loginCtrl', ['$rootScope', '$scope', '$http', '$cookies',
                                    function($rootScope, $scope, $http, $cookies) {

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
})();