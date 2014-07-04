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
        this._rootModule = new (require(this.modulePathPrefix + this.moduleRootPath))();
    },
    {
        modulePathPrefix: 'module/page',
        moduleRootPath: '/root',
        moduleNotFoundPath: '/not-found',

        update: function(fragment) {
            var data = parseFragment(fragment);

            if (this.onDispatch(data)) {
                return;
            }

            var path = data.path;
            var query = data.query;
            var self = this;

            var parentPath = this.modulePathPrefix;
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
                    CurrentModuleFactory = require(this.modulePathPrefix + this.moduleNotFoundPath);
                }
                else {
                    // pass other case
                    throw e;
                }
            }

            var currentModule = new CurrentModuleFactory();
            
            currentModule.__active = ko.observable(true);
            currentModule.__view = '<div class="page page' + path.replace(this.modulePathPrefix, '').replace(/\//g, '-') + '" data-bind="visible: __active">' + currentModule.__view + '</div>';

            return currentModule;
        },

        // 重写此方法可以用作重定向，或者过滤父路径
        // 返回true可以跳过之后的处理流程
        onDispatch: function(data) {
            return false;
        },

        // 例1：重定向
        // onDispatch: function(data) {
        //     if (data.path.indexOf('admin') === 0) {
        //         history.navigate('login?from=admin', {replace: true});
        //         return true;
        //     }
        // }

        // 例2：过滤父路径
        // onDispatch: function(data) {
        //     data.path = data.path.replace('admin/', '');
        // }

        render: function(el) {
            el.innerHTML = this._rootModule.__view;
            ko.applyBindings(this._rootModule, el);
        }
    }
);
