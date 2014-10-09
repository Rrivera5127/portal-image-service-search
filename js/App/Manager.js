define([
        'dojo/_base/declare',
        'dojo/_base/lang',
        "dojo/dom-construct",
        "dojo/dom-attr",
        "dojo/dom-style",
        "dojo/_base/window" ,
        "esri/IdentityManager",
        "esri/map",
        "./ServiceLister/ExtentFilterServiceLister"
    ],
    function (declare, lang, domConstruct, domAttr, domStyle, window, IdentityManager, Map, ExtentFilterServiceLister) {
        return declare([], {
            portalUrl: "",
            constructor: function (params) {
                lang.mixin(this, params || {});
                this._createMap();
            },
            _createMap: function () {
                this.map = new Map("map", {
                    basemap: "topo",
                    center: [-122.45, 37.75], // longitude, latitude
                    zoom: 5
                });
                this.map.on("load", lang.hitch(this, this._createExtentFilterServiceLister));
            },
            _createExtentFilterServiceLister: function (evt) {
                this._createServiceChangeView();
                if (!evt || !evt.map) {
                    alert("There was an error creating the map");
                }
                this.extentFilterServiceLister = new ExtentFilterServiceLister({map: evt.map, portalUrl: this.portalUrl});
                //Just showing that the lister fires events
                this.extentFilterServiceLister.on("processing", lang.hitch(this, function () {
                    domConstruct.empty(this.resultsList);
                    domAttr.set(this.countContainer, "innerHTML", "");
                    this._showLoader();
                }));
                this.extentFilterServiceLister.on("load", function () {
                    console.log("All user services have been loaded");
                });
                this.extentFilterServiceLister.on("error", lang.hitch(this, function (errorString) {
                    console.log("error on service extent change");
                    domAttr.set(this.errorContainer, "innerHTML", errorString);
                    this._hideLoader();
                }));
                this.extentFilterServiceLister.on("servicesInExtentChange", lang.hitch(this, function (results) {
                    console.log("new service in extent have been calculated");
                    var label, i, currentLi, currentService, token = this.getToken(), currentUrl;
                    if (results) {
                        domAttr.set(this.countContainer, "innerHTML", "Result Count: " + results.length);
                        for (i = 0; i < results.length; i++) {
                            currentService = results[i];
                            if (currentService.url) {
                                currentUrl = currentService.url;
                                if (token) {
                                    currentUrl += "?token=" + token;
                                }
                                label = domConstruct.create("a", {target: "_blank", href: currentUrl, innerHTML: currentService.title});
                            }
                            else {
                                label = domConstruct.create("span", {innerHTML: currentService.title});
                            }
                            currentLi = domConstruct.create("li", { style: {margin: "5px 0"}});
                            domConstruct.place(label, currentLi);
                            domConstruct.place(currentLi, this.resultsList);
                        }
                    }
                    this._hideLoader();
                }));
                this.extentFilterServiceLister.startup();
            },
            _showLoader: function () {
                domStyle.set(this.loader, "display", "block");
            },
            _hideLoader: function () {
                domStyle.set(this.loader, "display", "none");
            },
            _createServiceChangeView: function () {
                this.domNode = domConstruct.create("div", {style: {background: "white",
                    borderRadius: "5px 5px 5px 5px", border: "1px solid #DFDFDF", width: "250px",
                    height: "700px", overflow: "auto", position: "absolute", right: "10px", top: "10px", fontSize: "9pt", padding: "10px"}});
                this.countContainer = domConstruct.create("div", {innerHTML: "Result Count: 0"});
                domConstruct.place(this.countContainer, this.domNode);
                this.errorContainer = domConstruct.create("div", {style: {color: "red"}});
                domConstruct.place(this.errorContainer, this.domNode);
                this.resultsContainer = domConstruct.create("div");
                domConstruct.place(this.resultsContainer, this.domNode);
                this.resultsList = domConstruct.create("ul", {style: {listStyleType: "none", padding: "5px"}});
                domConstruct.place(this.resultsList, this.resultsContainer);


                this.loader = domConstruct.create("img", {src: "images/loader.gif", style: {position: "absolute", top: "10px", right: "10px"}});
                domConstruct.place(this.loader, this.domNode);


                domConstruct.place(this.domNode, window.body());
            },
            getToken: function () {
                //token should auto renew. if they dont we need logic her to renew the token manually
                var credential = IdentityManager.findCredential(this.portalUrl);
                if (credential) {
                    return credential.token;
                }
                return null;
            }
        });
    });