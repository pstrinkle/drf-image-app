(function () {
    //'use strict';

    function b64EncodeUnicode(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
    }

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

    var ImgApp = angular.module('image_app', [
        'ngFileUpload',
        'ngCookies',
        'sticky',
        'ngSanitize',
        'ngMaterial',
        'ngResource',
    ]);

    ImgApp.directive('autolowercase', function() {
        return {
            require: 'ngModel',
            link: function(scope, element, attrs, modelCtrl) {
                modelCtrl.$parsers.push(function(input) {
                    return input ? input.toLowerCase() : "";
                });

                element.css("text-transform", "lowercase");
            }
        };
    });

    ImgApp.factory('Images', ['$resource', '$rootScope', function ($resource, $rootScope) {
        return $resource($rootScope.restUrl + 'image/:imageId', {}, {
            addLabel: {
                method: 'PUT',
                url: $rootScope.restUrl + 'image/:imageId/label/:labelId',
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            },
            remLabel: {
                method: 'DELETE',
                url: $rootScope.restUrl + 'image/:imageId/label/:labelId',
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            },
            list: {
                method: 'GET',
                params: {format: 'json'},
                isArray: false,
            },
            options: {method: 'OPTIONS', params: {format: 'json'}},
            update: {
                method: 'PUT',
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
            },
        });
    }]).factory('Labels', ['$resource', '$rootScope', function ($resource, $rootScope) {
        return $resource($rootScope.restUrl + 'label/:labelId', {}, {
            options: {method: 'OPTIONS', params: {format: 'json'}},
            update: {
                method: 'PUT',
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
            },
        });
    }]).factory('Users', ['$resource', '$rootScope', function ($resource, $rootScope) {
        return $resource($rootScope.restUrl + 'user/:userId', {}, {
            options: {method: 'OPTIONS', params: {format: 'json'}},
            secondary: {
                method: 'POST',
                url: $rootScope.restUrl + 'user/:userId/secondarylogin',
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
            },
        });
    }]);

    ImgApp.config(function($locationProvider) {});

    /* XXX: Define all of the following into resources. */
    var handleImages = function($scope, response) {

        console.log('response: ' + JSON.stringify(response));

        $scope.photos.length = 0;
        emptyDictionary($scope.downloadSelection);
        $scope.downloadCount = 0;

        jQuery('#listProgress').show();

        console.log('total items: ' + response.count);

        //"next": "http://127.0.0.1:8000/api/v1/image?page=2",
        //"previous": null

        if (response.previous == null) {
            $scope.prevPageNum = 'n/a';
            $scope.currentPage = 1;
            if (response.next) {
                $scope.nextPageNum = 2;
            } else {
                $scope.nextPageNum = 'n/a';
            }
        } else {
            /* previous page isn't null, but we may be in the middle or the end. */

            /* previous page could be the 0th page, and then won't have the page parameter. */

            var prev = response.previous;
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
                if (response.next) {
                    $scope.nextPageNum = page + 2;
                } else {
                    $scope.nextPageNum = 'n/a';
                }
            } else {
                /* absolutely zero parameters; prev is the 1st page. */
                $scope.prevPageNum = 1;
                $scope.currentPage = 2;

                if (response.next) {
                    $scope.nextPageNum = 3;
                } else {
                    $scope.nextPageNum = 'n/a';
                }
            }
        }

        $scope.prevLink = response.previous;
        $scope.nextLink = response.next;

        // temp code.
        angular.forEach(response.results, function(element, index) {
            $scope.addImage(element.id, element.thumbnail, element.labels);
        });

        delete response.results;
        console.log('response elements: ' + JSON.stringify(response, null, 2));

        jQuery('#listProgress').hide();
    }

    ImgApp.run(function($rootScope, $http) {

        $rootScope.restUrl = '/api/v1/';

        $rootScope.loggedin = false;

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

        jQuery('#uploadtrackingContainer').hide();
    });

    ImgApp.controller('photoCtrl',
                      ['$rootScope', '$scope', '$mdDialog', '$http',
                       '$location', '$cookies', '$window', '$q', 'Upload',
                       'Images', 'Labels', 'Users',
                       function($rootScope, $scope, $mdDialog, $http,
                                $location, $cookies, $window, $q, Upload,
                                Images, Labels, Users) {

        $scope.config = {};
        $scope.photos = [];
        $scope.prevPageNum = -1;
        $scope.currentPage = 0;
        $scope.nextPageNum = 1;
        $scope.prevLink = null;
        $scope.nextLink = null;

        $scope.unlabeledSelected = false;
        $scope.selected = []; // used for filtering the images.

        $scope.downloadSelection = {};
        $scope.downloadCount = 0;

        $scope.labelCnts = {};
        $scope.labelLookup = {};
        $scope.labels = [];
        $scope.multiLabel = "";

        $scope.uploadQueue = [];
        $scope.progressBar = 0;

        $scope.addLabel = function(label, id, cnt) {
            $scope.labels.push(label);
            $scope.labelLookup[label] = id;
            $scope.labelCnts[label] = cnt;
        }

        $scope.addImage = function(id, src, labels) {
            $scope.photos.push({'id': id,
                                'src': src,
                                'labels': labels})
        }

        /* the following hack is to force sequential adding of labels, followed by updating the whole image.
         *
         * really this should use an array at a higher level of scope that has an action detail so that someone
         * can delete a label from an image while the system is still adding them, and it just keeps processing updates
         * until they're all done.
         */
        var addLabels = function($scope, labels, index, image_id) {

            /* we know addLabels is called with at least one entry in labels, and index starting at 0, so if the
             * index equals the length we've processed them all.
             */
            if (index == labels.length) {

                Images.get({imageId: image_id}).$promise
                    .then(function success(response) {
                        console.log('image+label response: ' + JSON.stringify(response));

                        for (var i = 0; i < $scope.photos.length; i++) {
                            if ($scope.photos[i].id == image_id) {

                                console.log('found photo pull after adding labels');
                                console.log('unlabeledSelected: ' + $scope.unlabeledSelected);

                                $scope.photos[i].labels.length = 0;
                                $scope.photos[i].labels = response.labels;

                                break;
                            }
                        }
                    });

                /* don't go below. */
                return;
            }

            /* if this label is entirely new, create then attach it, otherwise just attach it. */
            var ll = labels[index];

            if ($scope.labelLookup[ll] == undefined) {

                Labels.save({value: ll}).$promise
                    .then(function success(resp) {
                        console.log('successfully created label: ' + JSON.stringify(resp));

                        $scope.addLabel(resp.value, resp.id, resp.count);
                        var label_id = resp.id;

                        Images.addLabel({imageId: image_id, labelId: label_id}, {}).$promise
                            .then(function success(response) {

                                $scope.labelCnts[ll] += 1;

                                /* we've created the label and now added it to our image; move forward */
                                addLabels($scope, labels, index + 1, image_id);
                            });
                    });
            } else {
                label_id = $scope.labelLookup[ll];

                Images.addLabel({imageId: image_id, labelId: label_id}, {}).$promise
                    .then(function success(resp) {
                        /* the label count should go up by 1 */
                        $scope.labelCnts[ll] += 1;

                        /* we've added it to our image; move forward */
                        addLabels($scope, labels, index + 1, image_id);
                    });
            }
        }

        $scope.allImagesFilter = function() {
            for (var i = 0; i < $scope.selected.length; i++) {
                $scope.labels.push($scope.selected[i]);
            }

            $scope.selected.length = 0;

            Images.list().$promise
                .then(function(response) {
                    handleImages($scope, response);
                });
        }

        var loggedinInit = function() {
            jQuery('#loginformarea').hide();

            Labels.options().$promise
                .then(function(result) {
                    console.log('result: ' + JSON.stringify(result, null, 2));
                    $scope.config = result.actions.POST;
                    $scope.config.value.pattern = new RegExp($scope.config.value.pattern);
                });

            // they loaded logged in, so let's load everything to start with.
            Labels.query().$promise
                .then(function(response) {
                    angular.forEach(response, function(element, index) {
                        console.log('label: ' + element.value + ' id: ' + element.id);

                        $scope.addLabel(element.value, element.id, element.count);
                    });
                });

            Images.list().$promise
                .then(function(response) {
                    handleImages($scope, response);
                });
        }

        /* Test the user's credentials and initialize the lists. */
        if ($rootScope.token && $rootScope.user) {
            var id = $rootScope.user.id;

            Users.get({userId: id}).$promise
                .then(function success(response) {
                    console.log('response: ' + JSON.stringify(response));

                    $rootScope.loggedin = true;

                    loggedinInit();
                });
        }

        $scope.addFilter = function(filter) {
            console.log('addFilter: ' + filter);
            $scope.selected.push(filter); // add to selection.
            for (var i = 0; i < $scope.labels.length; i++) {
                if ($scope.labels[i] === filter) {
                    $scope.labels.splice(i, 1);
                    break;
                }
            }

            /* this isn't the most efficient. */
            Images.list({labels: $scope.selected}).$promise
                .then(function(response) {
                    handleImages($scope, response);
                });
        }

        $scope.delFilter = function(filter) {
            console.log('delFilter: ' + filter);
            $scope.labels.push(filter); // add to selection.
            for (var i = 0; i < $scope.selected.length; i++) {
                if ($scope.selected[i] === filter) {
                    $scope.selected.splice(i, 1);
                    break;
                }
            }

            Images.list({labels: $scope.selected}).$promise
                .then(function(response) {
                    handleImages($scope, response);
                });
        }

        $scope.unlabeledFilter = function() {
            /* de-select all filters. */
            for (var i = 0; i < $scope.selected.length; i++) {
                $scope.labels.push($scope.selected[i]);
            }

            $scope.selected.length = 0;
            $scope.photos.length = 0;
            emptyDictionary($scope.downloadSelection);
            $scope.downloadCount = 0;

            Images.list({unlabeled: true}).$promise
                .then(function(response) {
                    console.log('list images.response: ' + JSON.stringify(response));

                    handleImages($scope, response);
                });
        }

        /* Start edit labels dialog code */
        function DialogController($scope, $mdDialog) {
            $scope.hide = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
                $mdDialog.cancel();
            };

            $scope.save = function() {
                var tasks = [];

                console.log('$scope.labels: ' + JSON.stringify($scope.labels, null, 2));

                /* Walk through the list of items (not being deleted) and see if they've changed */
                for (var i = 0; i < $scope.labels.length; i++) {
                    var label = $scope.labels[i];

                    var $inputField = jQuery('#edit_label_' + $scope.labelLookup[label]);
                    var value = $inputField.val().trim();

                    if (label != value) {
                        console.log('label changed: was: ' + label + ' now: ' + value);

                        /* did they delete it? -- */
                        if ($scope.toDelete.indexOf(label) != -1) {
                            console.log('they deleted it');
                        } else {
                            (function () {
                                var l = label;
                                var v = value;
                                var lid = $scope.labelLookup[label];

                                var updateLabel = function() {
                                    Labels.update({labelId: lid}, {value: v}).$promise
                                        .then(function success(response) {

                                            $scope.labelLookup[v] = $scope.labelLookup[l];
                                            $scope.labelCnts[v] = $scope.labelCnts[l];

                                            delete $scope.labelLookup[l];
                                            delete $scope.labelCnts[l];

                                            for (var k = 0; k < $scope.labels.length; k++) {
                                                if ($scope.labels[k] === l) {
                                                    $scope.labels[k] = v;
                                                    break;
                                                }
                                            }
                                            for (var j = 0; j < $scope.selected.length; j++) {
                                                if ($scope.selected[j] === l) {
                                                    $scope.selected[j] = v;
                                                    break;
                                                }
                                            }

                                            console.log('successfully renamed it');
                                        });
                                }

                                tasks.push(updateLabel);
                            })();
                        }
                    }
                }

                /* Walk through the list of items to delete, and delete them. */
                for (var i = 0; i < $scope.toDelete.length; i++) {
                    var label_id = $scope.toDelete[i];

                    (function () {
                        var l = $scope.reverseLookup[label_id];
                        var lid = label_id;

                        var deleteLabel = function() {
                            console.log('deleting: ' + l);

                            Labels.delete({labelId: lid}).$promise
                                .then(function success(response) {
                                    console.log('del label.response: ' + JSON.stringify(response));
                                    delete $scope.labelLookup[l];
                                    delete $scope.labelCnts[l];

                                    for (var k = 0; k < $scope.labels.length; k++) {
                                        if ($scope.labels[k] === l) {
                                            $scope.labels.splice(k, 1);
                                            break;
                                        }
                                    }

                                    for (var j = 0; j < $scope.selected.length; j++) {
                                        if ($scope.selected[j] === l) {
                                            $scope.selected.splice(j, 1);
                                            break;
                                        }
                                    }
                                });

                        }

                        tasks.push(deleteLabel);
                    })();
                }

                var hideThis = function() {
                    $mdDialog.hide();
                }

                tasks.push(hideThis);

                console.log('starting the actions');
                serial(tasks);
            }

            $scope.toDelete = [];

            $scope.del = function(lid) {
                console.log('try deleting label: ' + lid);
                $scope.toDelete.push(lid);

                jQuery('#edit_label_' + lid).css('text-decoration', 'line-through');
            }
        }

        $scope.launchEditLabels = function(ev) {

            /* these only matter during an edit session. */
            $scope.editLabels = [];
            $scope.reverseLookup = {};

            for (var i = 0; i < $scope.labels.length; i++) {
                var l = $scope.labels[i];
                var d = $scope.labelLookup[l];
                $scope.editLabels.push({value: l, id: d});
                $scope.reverseLookup[d] = l;
            }

            $mdDialog.show({
                controller: DialogController,
                templateUrl: 'labels.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose:true,
                fullscreen: false,
                scope: $scope,        // use parent scope in template
                preserveScope: true,  // do not forget this if use parent scope
            });
        };
        /* Stop edit labels dialog code */

        /* Start image zoom dialog code */
        function ZoomController($scope, $mdDialog, image) {
            $scope.cancel = function() {
                $mdDialog.cancel();
            };

            $scope.image = image;
        }

        $scope.showZoom = function(ev, image_src) {
            image_src = image_src.replace('thumbnails/', '');

            $mdDialog.show({
                controller: ZoomController,
                templateUrl: 'zoom.tmpl.html',
                targetEvent: ev,
                clickOutsideToClose:true,
                fullscreen: true,
                locals: {
                    image: image_src
                }
            });
        }
        /* Stop image zoom dialog code */

        function DeleteController($scope, $mdDialog, image) {
            $scope.cancel = function() {
                $mdDialog.cancel();
            };

            $scope.image = image;

            $scope.delImage = function() {
                console.log('delete photo: ' + image);
            };
        }

        $scope.showDelete = function(ev, image_id) {
            var confirm = $mdDialog.confirm()
                .title('Delete Image?')
                .textContent('Are you sure you want to delete it?')
                .ariaLabel('Image Deletion')
                .targetEvent(ev)
                .ok('Yes')
                .cancel('No');

            $mdDialog.show(confirm).then(function() {
                console.log('try deleting: ' + image_id);

                Images.delete({imageId: image_id}).$promise
                    .then(function success(response) {
                        console.log('del image.response: ' + JSON.stringify(response));

                        for (var i = 0; i < $scope.photos.length; i++) {
                            if ($scope.photos[i].id == image_id) {
                                $scope.photos.splice(i, 1);
                                break;
                            }
                        }
                    });
            }, function() {
                // ignore close.
            });
        }

        /* Page Buttons. */
        $scope.prevPage = function() {
            $http({
                url: $scope.prevLink,
            }).then(function success(response) {
                handleImages($scope, response.data);
            });
        }

        $scope.nextPage = function() {
            $http({
                url: $scope.nextLink,
            }).then(function success(response) {
                handleImages($scope, response.data);
            });
        }

        /* Create Label */
        $scope.createLabel = function() {
            Labels.save({value: $scope.newLabel}).$promise
                .then(function success(resp) {
                    console.log('successfully created label: ' + JSON.stringify(resp));
                    $scope.addLabel(resp.value, resp.id, resp.count);
                });
        }

        /* Toolbar controls. */
        /* Select unlabeled filter. */
        $scope.selectUnlabeled = function(e) {
            console.log('clicked unlabeled');

            var $t = jQuery('#unlabeledChip');

            /* are they selecting or de-selecting? */
            if ($t.hasClass('active')) {
                $t.removeClass('active');

                $scope.unlabeledSelected = false;
                $scope.allImagesFilter();
            } else {
                $t.addClass('active');

                $scope.unlabeledSelected = true;
                $scope.unlabeledFilter();
            }

            $(e.target).blur();
            $t.blur();
            e.preventDefault();

            return false;
        }

        /* Select filter. */
        $scope.selectLabel = function(chip) {
            if ($scope.unlabeledSelected) {
                $scope.unlabeledSelected = false;
                jQuery('#unlabeledChip').removeClass('active');
            }

            var filter = chip.trim();
            console.log('filter: ' + filter);
            $scope.addFilter(filter);
        }

        /* De-select filter. */
        $scope.deselectLabel = function(chip) {
            var filter = chip.trim();

            console.log('filter: ' + filter);
            $scope.delFilter(filter);
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

        /* Image upload. */
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
            var closeUpload = function() {
                jQuery('#uploadtrackingContainer').fadeOut();
            }

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

        /* Remove a label from an image. */
        $scope.removeLabel = function(chip, image_id) {
            console.log('new chip: ' + chip);
            console.log('clicked: ' + image_id);

            var label = chip;

            if (label && label.length > 0) {
                label_id = $scope.labelLookup[label];

                Images.remLabel({imageId: image_id, labelId: label_id}).$promise
                    .then(function success(resp) {
                        /* the label count should go up by 1 */
                        $scope.labelCnts[label] -= 1;

                        /* we've added it to our image; move forward */
                        Images.get({imageId: image_id}).$promise
                            .then(function success(response) {
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
                                            $scope.photos[i].labels = response.labels;
                                        }

                                        break;
                                    }
                                }
                            });
                    });
            }
        }

        /* Add a label to an image. */
        $scope.linkLabel = function(chip, image_id) {
            console.log('new chip: ' + chip);
            console.log('clicked: ' + image_id);

            var label = chip;

            if (label && label.length > 0) {
                //labels = label.split(',');
                var labelsToAdd = [];
                labelsToAdd.push(label);

                addLabels($scope, labelsToAdd, 0, image_id);
            }
        }

        /* autocomplete for adding labels. */
        $scope.selectedItem = null;
        $scope.searchText = null;
        $scope.querySearch = querySearch;

        function querySearch (query) {
            var results = query ? $scope.labels.filter(createFilterFor(query)) : [];
            return results;
        }

        function createFilterFor(query) {
            var lowercaseQuery = angular.lowercase(query);

            return function filterFn(label) {
                return (label.indexOf(lowercaseQuery) === 0);
            };
        }

        /* Selecting an image. */
        $scope.selectForDownload = function(e) {
            var id = jQuery(e.target).attr('id').replace('select_', '');
            console.log('selected for download: ' + id);

            if ($scope.downloadSelection[id] == undefined) {
                $scope.downloadSelection[id] = 1;
            } else {
                delete $scope.downloadSelection[id];
            }

            $scope.downloadCount = Object.keys($scope.downloadSelection).length;
        }

        /* Logout. */
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

        /* Handle login. */
        function LoginController($scope, $mdDialog) {
            $scope.hide = function() {
                $mdDialog.hide();
            };

            $scope.cancel = function() {
                $mdDialog.cancel();
            };

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

                    Users.secondary({userId: response.data.user.id}, {username: u, password: p}).$promise
                        .then(function success(response) {
                            console.log('logged in successfully!');

                            $mdDialog.cancel();

                            loggedinInit();
                        });
                }, function error(data) {
                    console.log(data);
                    console.log('error returned!');
                });
            }
        }

        $scope.showLogin = function(ev) {
            $mdDialog.show({
                controller: LoginController,
                templateUrl: 'login.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose:true,
                fullscreen: false,
                scope: $scope,        // use parent scope in template
                preserveScope: true,  // do not forget this if use parent scope
            });
        };
    }]);

    //https://richardtier.com/2014/03/15/authenticate-using-django-rest-framework-endpoint-and-angularjs/
    //https://github.com/akoenig/angular-deckgrid
})();