
function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

var ImgApp = angular.module('image_app', [
    'akoenig.deckgrid',
    'lr.upload'
]);

ImgApp.controller('loginCtrl', function ($scope, $http) {
    function success(response) {
        console.log('Logged in!', new Date());
    }

    function error(data) {
        console.log(data);
    }

    $scope.login = function (u, p, success, error) {
        $http({
            url: '/auth/login/',
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + b64EncodeUnicode(u + ':' + p)
            }
        }).then(success, error);
    }
});

ImgApp.controller('photoCtrl', function ($scope) {
    $scope.photos = [
        {id: 'p1', 'title': 'A nice day!', src: "http://lorempixel.com/300/400/"},
        {id: 'p2', 'title': 'Puh!', src: "http://lorempixel.com/300/400/sports"},
        {id: 'p3', 'title': 'What a club!', src: "http://lorempixel.com/300/400/nightlife"}
    ];
});

ImgApp.controller('uploadCtrl', function ($scope, upload) {
    $scope.doUpload = function () {
        upload({
            url: '/api/v1/image',
            method: 'POST',
            data: {
                file: $scope.myFile, // a jqLite type="file" element, upload() will extract all the files from the input and put them into the FormData object before sending.
            }
        }).then(
            function (response) {
                console.log(response.data); // will output whatever you choose to return from the server on a successful upload
            },
            function (response) {
                console.error(response); //  Will return if status code is above 200 and lower than 300, same as $http
            }
        );
    }
});

//https://richardtier.com/2014/03/15/authenticate-using-django-rest-framework-endpoint-and-angularjs/
//https://github.com/akoenig/angular-deckgrid


