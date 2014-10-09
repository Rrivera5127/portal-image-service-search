define([
        'dojo/_base/declare',
        "dojo/Deferred",
        "dojo/Evented",
        'dojo/_base/lang',
        "./UserAwareMixin"
    ],
    function (declare, Deferred, Evented, lang, UserAwareMixin) {
        return declare([UserAwareMixin, Evented], {
            PORTAL_IMAGE_SERVICES_ONLY: '(type:"Image Service") -type:"Feature Service" -type:"WMS" -type:"KML" -type:"Map Service" -type:"Layer" -type: "Map Document" -type:"Map Package" -type:"Basemap Package" -type:"Mobile Basemap Package" -type:"Mobile Map Package" -type:"ArcPad Package" -type:"Project Package" -type:"Project Template" -type:"Desktop Style" -type:"Pro Map" -type:"Layout" -type:"Explorer Map" -type:"Globe Document" -type:"Scene Document" -type:"Published Map" -type:"Map Template" -type:"Windows Mobile Package" -type:"Layer Package" -type:"Explorer Layer" -type:"Geoprocessing Package" -type:"Application Template" -type:"Code Sample" -type:"Geoprocessing Package" -type:"Geoprocessing Sample" -type:"Locator Package" -type:"Workflow Manager Package" -type:"Windows Mobile Package" -type:"Explorer Add In" -type:"Desktop Add In" -type:"File Geodatabase" -type:"Feature Collection Template" -type:"Code Attachment" -type:"Featured Items" -type:"Symbol Set" -type:"Color Set" -type:"Windows Viewer Add In" -type:"Windows Viewer Configuration"',
            WEB_MERCATOR_WKID: 102100,
            WGS84_WKID: 4326,
            constructor: function () {
                this._createTemplates();
            },
            startup: function () {
                this.loadUserSelf().then(lang.hitch(this, function (userAndPortalInfo) {
                    if (userAndPortalInfo) {
                        if (userAndPortalInfo.user) {
                            this._loadUserContent(userAndPortalInfo.user, userAndPortalInfo.token);
                        }
                    }
                }));
            },
            _createTemplates: function () {
                this.communityGroupsEndpoint = "sharing/rest/community/groups";
                this.searchEndpoint = "sharing/rest/search";
            },
            _loadEsriLayerContentGroupInfo: function (token) {
                var def = new Deferred();
                var params = {
                    q: "title: \"Esri Map Layers\" AND owner:esri",
                    f: "json"
                };
                if (token) {
                    params.token = token;
                }
                this.loadJsonP(this.joinUrl(this.portalUrl, this.communityGroupsEndpoint), params, lang.hitch(this, function (esriGroupsResult) {
                    if (esriGroupsResult && esriGroupsResult.results && esriGroupsResult.results.length) {
                        def.resolve(esriGroupsResult.results[0].id);
                    }
                    else {
                        def.resolve(null);
                    }
                }));
                return def;
            },
            _loadUserContent: function (user, token) {
                var i;
                if (!user) {
                    return;
                }
                var queryParts = [];
                queryParts.push(("owner:" + user.username));
                if (user.groups && user.groups.length) {
                    for (i = 0; i < user.groups.length; i++) {
                        queryParts.push("group:" + user.groups[i].id)
                    }
                }
                this._loadEsriLayerContentGroupInfo(token).then(lang.hitch(this, function (esriLayersGroupId) {
                        if (esriLayersGroupId || esriLayersGroupId === 0) {
                            queryParts.push("group:" + esriLayersGroupId);
                        }
                        this.userQuery = "( " + queryParts.join(" OR ") + ") " + this.PORTAL_IMAGE_SERVICES_ONLY;
                        this._onLoad();
                    })
                );
            },
            _onLoad: function () {
                this.emit("load");
            }

        });
    });