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

        MODULE_ACTIVE: '__active',
        MODULE_VIEW: '__view',

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

            if (this._rootModule.update) {
                this._rootModule.update(query, path);
            }

            path.split('/').filter(Boolean).forEach(function(subPath) {
                var fullPath = parentPath + '/' + subPath;

                var currentModule = self._modules[fullPath];
                if (!currentModule) {
                    currentModule = self.createModule(fullPath);                       
                    self._modules[fullPath] = currentModule;
                    self.onAppendModuleToParent(parentModule, currentModule);
                }
            
                var lastActiveModule = self._activeModules[parentPath];

                if (lastActiveModule !== currentModule) {
                    if (lastActiveModule) {
                        lastActiveModule[self.MODULE_ACTIVE](false);
                    }
                    currentModule[self.MODULE_ACTIVE](true);
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

        createModule: function(path) {
            var CurrentModuleFactory;

            try {
                CurrentModuleFactory = require(path);
            }
            catch (e) {
                // not found
                if (e.message.indexOf('\'' + path + '\'') !== -1) {
                    CurrentModuleFactory = this.onModuleMissing(path);
                }
                else {
                    // pass other case
                    throw e;
                }
            }

            var currentModule = typeof CurrentModuleFactory === 'function' ? new CurrentModuleFactory() : CurrentModuleFactory;    

            currentModule[this.MODULE_ACTIVE] = ko.observable(true);
            currentModule[this.MODULE_VIEW] = this.onBuildModuleVisibleView(currentModule[this.MODULE_VIEW]);

            return currentModule;
        },

        onBuildModuleVisibleView: function(str) {  
            return '<div class="page" data-bind="visible: ' + this.MODULE_ACTIVE + '">' + str+ '</div>';
        },

        onModuleMissing: function(path) {
            return require(this.modulePathPrefix + this.moduleNotFoundPath);
        },

        onAppendModuleToParent: function(parent, child) {
            parent.add(child);
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
            el.innerHTML = this._rootModule[this.MODULE_VIEW];
            ko.applyBindings(this._rootModule, el);
        }
    }
);
