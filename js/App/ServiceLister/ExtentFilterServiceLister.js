define([
        'dojo/_base/declare',
        'dojo/_base/lang',
        "esri/geometry/webMercatorUtils",
        "./ServiceListerBase"
    ],
    function (declare, lang, webMercatorUtils, ServiceListerBase) {
        return declare([ServiceListerBase], {
            map: null,
            WEB_MERCATOR_WKID: 102100,
            WGS84_WKID: 4326,
            constructor: function (params) {
                lang.mixin(this, params || {});
                if (this.map) {
                    this.map.on("extent-change", lang.hitch(this, this._handleMapExtentChange));
                    this.on("load", lang.hitch(this, function () {
                        this._calculateServiceInExtent(this.map.extent);
                    }));
                }
            },
            _handleMapExtentChange: function (evt) {
                if (evt && evt.extent) {
                    this._calculateServiceInExtent(evt.extent);
                }
                else {
                    this.emit("error", "Invalid extent change");
                }
            },
            _calculateServiceInExtent: function (extent) {
                this.emit("processing");
                var wgs84Extent = extent, key, currentServiceItem, servicesInExtent = [];
                if (extent && extent.spatialReference) {
                    if (extent.spatialReference.wkid === this.WEB_MERCATOR_WKID) {
                        wgs84Extent = webMercatorUtils.webMercatorToGeographic(extent);

                    }
                    else {
                        if (extent.spatialReference.wkid !== this.WGS84_WKID) {
                            this.emit("error", "implement geometry service projection to WGS84 if base map is not wgs84 or web mercator");
                            return;
                        }
                    }
                }
                this._performQuery(wgs84Extent);
            },
            _performQuery: function (wgs84Extent, resultSet, startIndex) {
                var token = this.getToken(), params = {f: "json", q: this.userQuery, num: 50};
                params.start = startIndex || 0;
                if (!resultSet) {
                    resultSet = [];
                }
                if (token) {
                    params.token = token;
                }
                if (wgs84Extent) {
                    params.bbox = wgs84Extent.xmin + "," + wgs84Extent.ymin + "," + wgs84Extent.xmax + "," + wgs84Extent.ymax;
                }
                this.loadJsonP(this.joinUrl(this.portalUrl, this.searchEndpoint), params, lang.hitch(this, function (queryResponse) {
                    resultSet = resultSet.concat(queryResponse.results);
                    if (queryResponse.nextStart < 0) {
                        console.log("got all results");
                        resultSet.sort(this._resultsSorter);
                        this.emit("servicesInExtentChange", resultSet);
                    }
                    else {
                        console.log("querying for more results");
                        this._performQuery(wgs84Extent, resultSet, queryResponse.nextStart);
                    }
                }));
            },
            _resultsSorter: function (a, b) {
                return (a.title < b.title) ? -1 : (a.title > b.title) ? 1 : 0;
            }
        });
    });
