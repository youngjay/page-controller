var mixin = require('mixin-class');
var ko = require('knockout');
var pathToRegexp = require('path-to-regexp');

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
                var m = reg.exec(fragment);
                if (m) {
                    if (!module) {
                        module = moduleFactory();
                        module.__active = ko.observable(true);
                        module.__view = '<!-- ko if: __active -->' + module.__view + '<!-- /ko -->';
                        container.add(module);
                    }
                    if (module.update) {
                        module.update.apply(module, m.slice(1))
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