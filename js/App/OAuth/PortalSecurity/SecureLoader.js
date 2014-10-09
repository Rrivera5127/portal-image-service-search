/**
 * this class forces the user to be logged into portal to use the application. it loads the main config.json
 * and checks if requireOAuthLogin = true
 */
define([
        'dojo/_base/declare',
        'esri/request',
        'dojo/_base/lang',
        "dojo/topic",
        "esri/IdentityManager",
        'dojo/cookie',
        'dojo/json',
        "../OAuthHelper",
        "../../Manager"
    ],
    function (declare, esriRequest, lang, topic, IdentityManager, cookie, json, OAuthHelper, Manager) {
        return declare([], {
            configFile: "config.json",
            cookiePath: '/',
            esri_auth_prefix: 'esri_auth_',
            constructor: function () {
                var def = esriRequest({
                    url: this.configFile,
                    preventCache: true,
                    handleAs: "json"
                });
                def.then(lang.hitch(this, function (data) {
                        var persistUser = false;
                        this.appConfig = data;
                        if (window.location.hash.indexOf("error=access_denied") > -1 || window.location.hash.indexOf("error=invalid_request") > -1) {
                            window.location = this.appConfig.loginErrorForward || "http://www.esri.com";
                            return;
                        }
                        if (window.location.hash.indexOf("persist=true") > -1) {
                            persistUser = true;
                        }
                        if (this.appConfig.requireOAuthLogin) {
                            OAuthHelper.init({
                                appId: this.appConfig.appId,
                                portal: this.appConfig.portalUrl,
                                expiration: (7 * 24 * 60),
                                popup: false
                            });
                            if (!OAuthHelper.isSignedIn()) {
                                OAuthHelper.signIn();
                            }
                            else {
                                if (persistUser) {
                                    this.persistUser();
                                }
                                new Manager(
                                    {
                                        portalUrl: this.appConfig.portalUrl
                                    }
                                );
                                topic.subscribe('userSignOut', function () {
                                    location.reload();
                                });
                            }
                        }
                        else {
                            // new Manager();
                        }
                    }
                ));
            },
            persistUser: function () {
                var credential, isOnline, _portalUrl;
                credential = IdentityManager.findCredential(this.appConfig.portalUrl);
                isOnline = credential.server.toLowerCase().indexOf('.arcgis.com') >= 0;
                _portalUrl = isOnline ? credential.server + '/' : credential.server + '/arcgis/';
                _portalUrl = lang.trim(_portalUrl);
                cookie(this.getCookieKey(_portalUrl), json.stringify(credential), {
                    expires: new Date(credential.expires),
                    path: this.cookiePath
                });
            },
            getCookieKey: function (/*optional*/ _portalUrl) {
                var cookieKey = this.esri_auth_prefix + lang.trim(_portalUrl || this.appConfig.portalUrl);
                if (!cookieKey.endWith('/')) {
                    cookieKey += '/';
                }
                return cookieKey;
            }
        })
            ;
    })
;