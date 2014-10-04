var mixin = require('mixin-class');
var queryString = require('query-string');
var ko = require('knockout');

var parseFragment = function(str) {
    var parts = str.split('?');
    var query = parts[1];
    // remove hash
    if (query) {
        query = query.replace(/#.*/, '');
    }    
    return {
        path: parts[0],
        query: query ? queryString.parse(query) : {}
    }
};

module.exports = mixin(
    function(el) {
        this._modules = {};
        this._activeModules = {};
        this.MODULE_CHILDREN_VIEW_REPLACEMENT = '<!-- ko template: { foreach: ' + this.MODULE_CHILDREN + ', name: function(child) { return child.' + this.MODULE_VIEW + ' }} --><!-- /ko -->';

        this._rootModule = this.loadRootModule();
        if (el) {
            this.render(el);
        }
    },
    {
        modulePathPrefix: 'module/page',
        moduleRootPath: '/root',
        moduleNotFoundPath: '/not-found',

        MODULE_CHILDREN_VIEW_PLACEHOLDER: '{{children}}',
        MODULE_CHILDREN: '__children',
        MODULE_ACTIVE: '__active',
        MODULE_VIEW: '__view',
        PAGE_CLASS: 'page',

        update: function(fragment) {
            var data = parseFragment(fragment);

            if (this.onDispatch(data)) {
                return;
            }

            var path = data.path;
            var query = data.query;
            var self = this;

            var parentPath = '';
            var parentModule = this._rootModule;

            if (this._rootModule.update) {
                this._rootModule.update(query, path);
            }

            path.split('/').filter(Boolean).forEach(function(subPath) {
                var fullPath = parentPath + '/' + subPath;

                var currentModule = self._modules[fullPath];
                if (!currentModule) {
                    currentModule = self.loadModule(fullPath);                       
                    self._modules[fullPath] = currentModule;
                    parentModule[self.MODULE_CHILDREN].push(currentModule);
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

        loadRootModule: function() {
            return this.loadModule(this.moduleRootPath);
        },

        loadModule: function(path) {
            path = this.modulePathPrefix + path;

            var CurrentModuleFactory;

            try {
                CurrentModuleFactory = require(path);
            }
            catch (e) {
                // not found
                if (e.message.indexOf('\'' + path + '\'') !== -1) {
                    CurrentModuleFactory = this.loadMissingModule(path);
                }
                else {
                    // pass other case
                    throw e;
                }
            }

            return this.buildModule(CurrentModuleFactory);
        },

        buildModule: function(CurrentModuleFactory) {
            var currentModule = typeof CurrentModuleFactory === 'function' ? new CurrentModuleFactory() : CurrentModuleFactory;

            currentModule[this.MODULE_CHILDREN] = ko.observableArray();
            currentModule[this.MODULE_ACTIVE] = ko.observable(true);
            currentModule[this.MODULE_VIEW] = this.buildModuleView(currentModule[this.MODULE_VIEW]);

            return currentModule;
        },

        buildModuleView: function(str) {
            return '<!-- ko if: ' + this.MODULE_ACTIVE + ' -->' + str.replace(this.MODULE_CHILDREN_VIEW_PLACEHOLDER, this.MODULE_CHILDREN_VIEW_REPLACEMENT) + '<!-- /ko -->';
        },

        loadMissingModule: function(path) {
            return require(this.modulePathPrefix + this.moduleNotFoundPath);
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
