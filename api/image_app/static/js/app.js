
var ImgApp = angular.module('image_app', ['akoenig.deckgrid']);

ImgApp.controller('HelloWorldController',
    ['$scope', function ($scope) {
        $scope.photos = [];
    }]
);

//https://richardtier.com/2014/03/15/authenticate-using-django-rest-framework-endpoint-and-angularjs/
//https://github.com/akoenig/angular-deckgrid