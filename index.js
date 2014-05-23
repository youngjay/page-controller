var mixin = require('mixin-class');
var ko = require('knockout');
var pathToRegexp = require('path-to-regexp');
var queryString = require('query-string');

var parseFragment = function(str) {
    var parts = str.split('?');
    return {
        path: parts[0],
        query: parts[1] ? queryString.parse(parts[1]) : {}
    }
};


var PageController = mixin(
    function(container, onChange) {
        this.container = container;
        this.onChange = onChange;
    },
    {
        add: function(route, moduleFactory) {
            var container = this.container;
            var reg = pathToRegexp(route);
            var module;
            this.onChange(function(fragment) {
                var data = parseFragment(fragment);
                var m = reg.exec(data.path);
                if (m) {
                    if (!module) {
                        module = moduleFactory();
                        module.__active = ko.observable(true);
                        module.__view = '<!-- ko if: __active -->' + module.__view + '<!-- /ko -->';
                        container.add(module);
                    }
                    if (module.update) {
                        module.update.apply(module, m.slice(1).concat(data.query));
                    }
                    module.__active(true);
                }
                else {
                    if (module) {
                        module.__active(false)
                    }
                }
            });
        }
    }
);

module.exports = PageController;