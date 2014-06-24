var mixin = require('mixin-class');
var queryString = require('query-string');
var ko = require('knockout');

var parseFragment = function(str) {
    var parts = str.split('?');
    return {
        path: parts[0],
        query: parts[1] ? queryString.parse(parts[1]) : {}
    }
};

module.exports = mixin(
    function() {
        this._modules = {};
        this._activeModules = {};
        this._rootModule = new (require(this.pathPrefix + this.rootPath))();
    },
    {
        pathPrefix: 'module/page',

        rootPath: '/root',

        notFoundModulePath: '/not-found',

        update: function(fragment) {
            var data = parseFragment(fragment);
            var path = data.path;
            var query = data.query;
            var self = this;

            var parentPath = this.pathPrefix;
            var parentModule = this._rootModule;

            path.split('/').forEach(function(subPath) {
                var fullPath = parentPath + '/' + subPath;

                var currentModule = self._modules[fullPath];
                if (!currentModule) {
                    currentModule = self._createModule(fullPath);                       
                    self._modules[fullPath] = currentModule;
                    parentModule.add(currentModule);
                }
            
                var lastActiveModule = self._activeModules[parentPath];

                if (lastActiveModule !== currentModule) {
                    if (lastActiveModule) {
                        lastActiveModule.__active(false);
                    }
                    currentModule.__active(true);
                    self._activeModules[parentPath] = currentModule;
                }

                if (currentModule.update) {
                    currentModule.update(query, path);
                }

                // for next iteration
                parentPath = fullPath;
                parentModule = currentModule;
            });
        },

        _createModule: function(path) {
            var CurrentModuleFactory;

            try {
                CurrentModuleFactory = require(path);
            }
            catch (e) {
                // not found
                if (e.message.indexOf('\'' + path + '\'') !== -1) {
                    CurrentModuleFactory = require(this.pathPrefix + this.notFoundModulePath);
                }
                else {
                    // pass other case
                    throw e;
                }
            }

            var currentModule = new CurrentModuleFactory();
            
            currentModule.__active = ko.observable(true);
            currentModule.__view = '<div class="page page' + path.replace(this.pathPrefix, '').replace(/\//g, '-') + '" data-bind="visible: __active">' + currentModule.__view + '</div>';

            return currentModule;
        },

        render: function(el) {
            el.innerHTML = this._rootModule.__view;
            ko.applyBindings(this._rootModule, el);
        }
    }
);
