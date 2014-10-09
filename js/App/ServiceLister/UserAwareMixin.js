define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "esri/IdentityManager",
        "dojo/Deferred",
        "esri/request"
    ],
    function (declare, lang, IdentityManager, Deferred, esriRequest) {
        return declare([], {
            userInformation: null,
            userPortal: null,
            userCredential: null,
            portalSelfCache: {},

            getToken: function () {
                //token should auto renew. if they dont we need logic her to renew the token manually
                var credential = IdentityManager.findCredential(this.portalUrl);
                if (credential) {
                    return credential.token;
                }
                return null;
            },

            /**
             * loads the users info and portal account info from their organization
             */
            loadUserAndPortal: function () {
                var currentTime, credential, def = new Deferred();
                credential = IdentityManager.findCredential(this.portalUrl);
                if (credential) {
                    currentTime = new Date().getTime();
                    if (credential.expires <= currentTime) {
                        this._clearUser();
                        credential.refreshToken().then(lang.hitch(this, this._loadUserAndPortal, def));
                        return def;
                    }
                }
                if (this.userInformation && this.userPortal && credential.token) {
                    def.resolve({user: this.userInformation, portal: this.userPortal, token: credential.token});
                }
                else {
                    this._loadUserAndPortal(def);
                }
                return def;
            },
            _loadUserAndPortal: function (def) {
                this.loadUserSelf().then(lang.hitch(this,
                    function (userAndToken) {
                        if (!userAndToken || userAndToken.error) {
                            var userErrorResponse = {};
                            userErrorResponse.error = true;
                            userErrorResponse.message = userAndToken.message;
                            def.resolve(userErrorResponse);
                        }
                        this._handleLoadUsersPortal(userAndToken.user).then(lang.hitch(this, function (portal) {
                            var responseObject;
                            if (!portal || portal.error) {
                                responseObject = {};
                                responseObject.error = true;
                                responseObject.message = portal.message;
                            }
                            else {
                                responseObject = {user: userAndToken.user, portal: portal, token: userAndToken.token, credential: userAndToken.credential};
                            }
                            def.resolve(responseObject);
                        }));
                    }));
            },
            _clearUser: function () {
                this.userInformation = null;
                this.userPortal = null;
                this.userCredential = null;
            },
            /**
             * loads the users info from their organization portal
             * @returns {dojo.Deferred}
             */
            loadUserSelf: function () {
                var def, credential, url, params;
                def = new Deferred();
                credential = IdentityManager.findCredential(this.portalUrl);
                this.userCredential = credential;
                url = this.joinUrl(this.portalUrl, "sharing/community/self");
                params = {f: "json", token: credential.token};
                this.loadJsonP(url, params, lang.hitch(this, function (user) {
                        this._handleUserSelfResponse(user);
                        def.resolve({user: user, token: credential.token, credential: credential});
                    }),
                    lang.hitch(this, function (errorResponse) {
                        def.resolve({error: true, message: errorResponse ? errorResponse.message : "Error retrieving user account"});
                    })
                );
                return def;
            },
            loadPortalSelf: function (portalUrl, token) {
                var def = new Deferred(), credential, url, params;
                if (this.portalSelfCache[portalUrl]) {
                    def.resolve({portal: this.portalSelfCache[portalUrl]});
                }
                else {
                    url = this.joinUrl(portalUrl, "self");
                    params = {f: "json"};
                    if (token) {
                        params.token = token;
                    }
                    this.loadJsonP(url, params, lang.hitch(this, function (portalSelf) {
                            this.portalSelfCache[portalUrl] = portalSelf;
                            def.resolve({portal: portalSelf});
                        }),
                        lang.hitch(this, function (errorResponse) {
                            def.resolve({error: true, message: errorResponse ? errorResponse.message : "Error retrieving portal info"});
                        })
                    );
                }
                return def;
            },
            /**
             * handler for self call to users organization
             * @param user
             * @private
             */
            _handleUserSelfResponse: function (user) {
                this.userInformation = user;
            },
            /**
             * handler for portal info call for users organization
             * @param portal
             * @private
             */
            _handleUserPortalsResponse: function (portal) {
                this.userPortal = portal;
            },
            /**
             * loads the portal info for the passed user
             * @param user user with accountId to load portal info for
             * @returns {Deferred}
             * @private
             */
            _handleLoadUsersPortal: function (user) {
                var def, credential, url, params;
                def = new Deferred();
                if (!user || !user.accountId) {
                    def.resolve({error: true, message: "Could not load user information for portal account"});
                }
                credential = IdentityManager.findCredential(this.portalUrl);
                url = this.joinUrl(this.portalUrl, "sharing/portals/" + user.accountId);
                params = {f: "json", token: credential.token};
                this.loadJsonP(url, params, lang.hitch(this, function (portal) {
                        this._handleUserPortalsResponse(portal);
                        def.resolve(portal);
                    }),
                    lang.hitch(this, function (errorResponse) {
                        def.resolve({error: true, message: errorResponse ? errorResponse.message : "Error retrieving portal account"});
                    }));
                return def;
            },
            getCredential: function (url) {
                return IdentityManager.findCredential(url);
            },
            joinUrl: function (url, appendString) {
                if (!url) {
                    url = "";
                }
                if (!appendString) {
                    appendString = "";
                }
                var endingSlash = url.lastIndexOf("/") === url.length - 1;
                if (!endingSlash) {
                    url += "/";
                }
                //strip the starting slash off the appender
                if (appendString[0] === "/") {
                    appendString = appendString.substring(1);
                }
                return url + appendString;
            },
            loadJsonP: function (url, params, callback, errback, callbackParam, options, headers) {
                if (!errback) {
                    errback = lang.hitch(this, function (error) {
                        var msg = "Could not resource : " + url + ". Please verify URL is accessible.";
                    });
                }
                if (!callbackParam) {
                    callbackParam = "callback";
                }
                var jsonpArgs = {
                    headers: headers || {},
                    callbackParamName: callbackParam,
                    content: params,
                    url: url
                };
                if (!options) {
                    options = {};
                }
                esriRequest(jsonpArgs, options).then(callback, errback);
            }


        });
    });