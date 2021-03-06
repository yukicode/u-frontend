//property and map data
var model = {
    aptList: apts, //all the apartment data
    aptMarkerList: [], //all the markers of apartments
    defaultLoc: { lat: 47.610377, lng: -122.200679 },
    defaultZoom: 13,
};

var viewModel = {
    init: function () {
        view.init();
        this.setMap(); //init map
        this.setAutoComplete();
        this.setMapBounds(); //init the bounds of map
        this.selectedIcon = { //image and size of selected apartment marker
            url: "http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|" + "FF9B3F" +
            "|40|_|%E2%80%A2",
            scaledSize: new google.maps.Size(21, 34),
        };
        this.normalIcon = { //image and size of normal (unselected) apartment marker
            url: "http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|" + "FF4B43" +
            "|40|_|%E2%80%A2",
            scaledSize: new google.maps.Size(21, 34),
        };
        this.setInfoWindow(); //init infomation window
        this.setAptMarkers(); //set markers for all of the apartments
        this.currentMarker = null;
    },
    //set knockout observables and bind data
    applyBinding: function () {
        var self = this;
        this.bindData = {//data to bind to knockout
            sidebarList: ko.observableArray([]), //apartment shown in the side bar list
            searchTerm: ko.observable(""),
            searchLocation: ko.observable(""),
            sortOptions: ko.observableArray([
                "Sort By",
                "Name",
                "Price Low to High",
                "Price High to Low",
            ]),
            selectedSorting: ko.observable(""), //selected sorting method
            isShow: ko.observable(false), //if the sidebar is shown or not
            display: function (apt) { //display the selected apartment inforwindow
                if (!self.map) { //if map is not ready, alert user that the map is not ready
                    self.waitForLoading();
                    return;
                }
                if (self.currentMarker) {
                    self.currentMarker.setIcon(self.normalIcon);
                }
                self.currentMarker = model.aptMarkerList[apt.index];
                self.currentMarker.setIcon(self.selectedIcon);
                self.updateInfoWindow();
            },
            filter: function () { //filter list and markers based on search term and location
                if (!self.map) { //if map is not ready, alert user that the map is not ready
                    self.waitForLoading();
                    return;
                }
                self.filterName();
            },
            clearForm: function () { //reset filter
                if (!self.map) { //if map is not ready, alert user that the map is not ready
                    self.waitForLoading();
                    return;
                }
                self.clearForm();
            },
            sort: function () { //sort based on the selected method
                if (!self.map) { //if map is not ready, alert user that the map is not ready
                    self.waitForLoading();
                    return;
                }
                self.sort(self.bindData.selectedSorting());
            },
            highLight: function (data, event) { //highlight selected marker and list
                if (model.aptMarkerList.length) {
                    model.aptMarkerList[data.index].setIcon(self.selectedIcon);
                }
                event.currentTarget.classList.add("high-light");
            },
            normal: function (data, event) { //set marker and list back to normal
                if (model.aptMarkerList.length && model.aptMarkerList[data.index] !== self.currentMarker) {
                    model.aptMarkerList[data.index].setIcon(self.normalIcon);
                }
                event.currentTarget.classList.remove("high-light");
            },
            toggleShowHide: function () { //toggle show or hide side bar
                self.bindData.isShow(!self.bindData.isShow());
            },
        };
        ko.applyBindings(self.bindData);
    },
    setMap: function () {
        this.map = new google.maps.Map(view.mapDiv, {
            center: model.defaultLoc,
            zoom: model.defaultZoom,
        });
    },
    setMapBounds: function () {
        this.bounds = new google.maps.LatLngBounds();
    },
    renderBounds: function (marker) {
        this.bounds.extend(marker.position);
        this.map.fitBounds(this.bounds);
    },
    setAutoComplete: function () {
        var self = this;
        this.autocomplete = new google.maps.places.Autocomplete(view.workForm, {
            options: ["address"],
            componentRestrictions: { country: "us" }
        });
        this.autocomplete.addListener("place_changed", function () {
            var place = self.autocomplete.getPlace();
            if (place.geometry) {
                self.setWorkMarker(place.geometry.location);
                self.map.panTo(place.geometry.location);
            } else {
                self.workMarker = null;
                view.workForm.placeholder = "Enter a location";
            }
        });
    },
    setWorkMarker: function (loc) {
        if (!this.map) { return; }
        this.workMarker = new google.maps.Marker({
            position: loc,
            map: this.map,
            icon: {
                url: "./images/purple_MarkerW.png",
                scaledSize: new google.maps.Size(21, 34),
            },
            title: "Work Location",
        });
        this.workMarker.setMap(this.map);
        this.renderBounds(this.workMarker);
    },
    setAptMarkers: function () {
        if (!model.aptList || !this.map) { return; }
        var length = model.aptList.length;
        for (var i = 0; i < length; i++) {
            if (!model.aptList[i]) { break; }
            var marker = new google.maps.Marker({
                position: model.aptList[i].loc,
                map: this.map,
                icon: this.normalIcon,
                title: model.aptList[i].name,
                compactTitle: model.aptList[i].name.split(" ").join("").split("'").join("").toLowerCase(),
                aptIndex: i,
                show: true,
            });
            model.aptMarkerList.push(marker);
            this.bindData.sidebarList.push({ title: model.aptList[i].name, index: i, priceRange: model.aptList[i].priceRange });
            marker.setMap(this.map);
            this.renderBounds(marker);
            view.addListenerMarker(marker);
        }
    },
    toggleMarker: function (marker) { //toggle display or hide marker
        if (marker.show === false) {
            marker.setMap(null);
        } else {
            this.renderBounds(marker);
            marker.setMap(this.map);
        }
    },
    setInfoWindow: function () {
        this.infoWin = new google.maps.InfoWindow({ marker: null });
    },
    updateInfoWindow: function () {
        this.updateBasicInfo();
        this.updateYelpInfo();
        this.updateGoogleInfo();
    },
    updateBasicInfo: function () {
        var i = this.currentMarker.aptIndex,
            name = model.aptList[i].name || "",
            phone = model.aptList[i].phone || "Unknown",
            priceRange = model.aptList[i].priceRange || "Unknown";

        view.renderBasicInfo(name, phone, priceRange);
    },
    updateYelpInfo: function () {
        var marker = this.currentMarker;
        if (!marker) { return; }
        var i = marker.aptIndex,
            term = model.aptList[i].name || "",
            lat = model.aptList[i].loc.lat || 0,
            lng = model.aptList[i].loc.lng || 0;
        $.ajax({
            method: "GET",
            url: "http://localhost:3000/api/yelp/",
            data: {
                term: term,
                lat: lat,
                lng: lng,
            },
        }).done(function (data) {
            if (data.message) { //if the data comes with a message, then there is an error getting data from yelp
                view.renderYelpInfo({ error: "Not Found" });
            } else {
                view.renderYelpInfo(data);
            }
        }).fail(function (err) { //if the request failed, then there's error with connection
            view.renderYelpInfo({ error: "Unable to Connect" });
        });
    },
    updateGoogleInfo: function () {
        var marker = this.currentMarker;
        if (!marker) { return; }
        var i = marker.aptIndex,
            name = model.aptList[i].name,
            lat = model.aptList[i].loc.lat || 0,
            lng = model.aptList[i].loc.lng || 0;
        $.ajax({
            method: "GET",
            url: "http://localhost:3000/api/google/",
            data: {
                lat: lat,
                lng: lng,
                name: name,
            }
        }).done(function (data) {
            if (data.message) { //if the data comes with a message, then there is an error getting data from google
                view.renderGoogleInfo({ error: "Not Found" });
            } else {
                view.renderGoogleInfo(data);
            }
        }).fail(function (err) { //if the request failed, then there's error with connection
            view.renderGoogleInfo({ error: "Unable to Connect" });
        });
    },
    filterName: function () {
        var self = this;
        var searchTerm = this.bindData.searchTerm().trim().toLowerCase();
        this.bindData.sidebarList.removeAll(); //clear apartment list for the side bar
        this.setMapBounds();
        if (this.workMarker) {
            this.renderBounds(this.workMarker);
        }
        model.aptMarkerList.forEach(function (marker) {
            marker.show = true;
            //if a location is selected but the marker is not near the location, then marker should be hidden
            if (self.workMarker && (self.distance(self.workMarker.position, marker.position) > 0.0025)) {
                marker.show = false;
            }
            //if search by name and the name is not found, then marker should be hidden
            if (searchTerm && marker.compactTitle.indexOf(searchTerm) === -1) {
                marker.show = false;
            }
            if (marker.show === true) {
                //add apartments that match the search in the side bar list
                self.bindData.sidebarList.push({ title: marker.title, index: marker.aptIndex, priceRange: model.aptList[marker.aptIndex].priceRange });
            }
            self.toggleMarker(marker);
        });
        //reset sorting
        this.bindData.selectedSorting("Sort By");
    },
    //estimate distance between two locations 
    //Note: this is only estimation
    distance: function (loc1, loc2) {
        var x = loc1.lat() - loc2.lat();
        var y = loc1.lng() - loc2.lng();
        return x * x + y * y;
    },
    clearForm: function () {
        if (this.currentMarker) {
            this.currentMarker.setMap(null);
            this.currentMarker = null;
        }
        if (this.workMarker) {
            this.workMarker.setMap(null);
            this.workMarker = null;
        }
        this.bindData.searchTerm("");
        this.bindData.searchLocation("");
        this.filterName();
        this.infoWin.marker = null;
        this.infoWin.close();
        this.map.panTo(model.defaultLoc);
        this.bindData.selectedSorting("Sort By");
    },
    sort: function (method) {
        if (method === "Sort By") {
            return;
        } else if (method === "Name") {
            this.bindData.sidebarList.sort(function (left, right) {
                return left.title == right.title ? 0 : (left.title < right.title ? -1 : 1);
            });
        } else if (method === "Price Low to High") {
            this.bindData.sidebarList.sort(function (left, right) {
                var leftPrices, rightPrices;
                leftPrices = left.priceRange ? left.priceRange.split(" - ").join("").split("$") : ["", "10000", "0"];
                rightPrices = right.priceRange ? right.priceRange.split(" - ").join("").split("$") : ["", "10000", "0"];
                if (parseInt(leftPrices[1], 10) > parseInt(rightPrices[1], 10)) {
                    return 1;
                } else if (parseInt(leftPrices[1], 10) === parseInt(rightPrices[1], 10)) {
                    return 0;
                } else {
                    return -1;
                }
            });
        } else if (method === "Price High to Low") {
            this.bindData.sidebarList.sort(function (left, right) {
                var leftPrices, rightPrices;
                leftPrices = left.priceRange ? left.priceRange.split(" - ").join("").split("$") : ["", "10000", "0"];
                rightPrices = right.priceRange ? right.priceRange.split(" - ").join("").split("$") : ["", "10000", "0"];
                if (parseInt(leftPrices[2], 10) < parseInt(rightPrices[2], 10)) {
                    return 1;
                } else if (parseInt(leftPrices[2], 10) === parseInt(rightPrices[2], 10)) {
                    return 0;
                } else {
                    return -1;
                }
            });
        }
    },
    mapError: function () {
        alert("Error getting google map");
    },
    waitForLoading: function () {
        alert("Wait for map to load...");
    },
};

var view = {
    init: function () {
        this.mapDiv = document.getElementById("map");
        this.workForm = document.getElementById("work-loc");
        this.formattedInfoContent = {
            start: '<div id="content">',
            end: '</div>',
            title: '',
            basic: '',
            yelp: '<p>' + 'Yelp Review: Loading...' + '</p>',
            google: '<p>' + 'Google Review: Loading...' + '</p>',
            img: '',
        };
    },
    //add listeners to the marker
    addListenerMarker: function (marker) {
        var self = this;
        marker.addListener("click", function () {
            self.formattedInfoContent = {
                start: '<div id="content">',
                end: '</div>',
                title: '',
                basic: '',
                yelp: '<p>' + 'Yelp Review: Loading...' + '</p>',
                google: '<p>' + 'Google Review: Loading...' + '</p>',
                img: '',
            };
            //when a marker is selected, reset the old selected marker to normal,
            //then highlight the currently selected marker
            if (viewModel.currentMarker) {
                viewModel.currentMarker.setIcon(viewModel.normalIcon);
            }
            viewModel.currentMarker = marker;
            viewModel.currentMarker.setIcon(viewModel.selectedIcon);
            viewModel.updateInfoWindow();
        });
        marker.addListener("mouseover", function () {
            marker.setIcon(viewModel.selectedIcon);
        });
        marker.addListener("mouseout", function () {
            if (viewModel.currentMarker !== marker) {
                marker.setIcon(viewModel.normalIcon);
            }
        });
    },
    renderInfoWindow: function () {
        var infoWindow = viewModel.infoWin,
            marker = viewModel.currentMarker,
            content = this.formattedInfoContent.start +
                this.formattedInfoContent.title +
                this.formattedInfoContent.basic +
                this.formattedInfoContent.yelp +
                this.formattedInfoContent.google +
                this.formattedInfoContent.end;
        if (this.formattedInfoContent.img) {
            content = this.formattedInfoContent.img + content;
        }
        content = '<div class="flex">' + content + '</div>';
        if (infoWindow) {
            infoWindow.setContent(content);
            infoWindow.marker = marker;
            infoWindow.addListener("closeclick", function () {
                infoWindow.marker = null;
            });
            infoWindow.open(viewModel.map, marker);
        }
    },
    renderBasicInfo: function (name, phone, priceRange) {
        if (!viewModel.currentMarker) {
            return;
        }
        this.formattedInfoContent.title = '<h4>' + name + '</h4>';
        this.formattedInfoContent.basic = '<p>' + "Tel: " + this.formatPhone(phone) + '</p>' +
            '<p>' + "Price Range: " + priceRange + '</p>';
        this.formattedInfoContent.img = '';
        this.renderInfoWindow();
    },
    renderYelpInfo: function (data) {
        if (data.error) {
            this.formattedInfoContent.yelp = '<p>' + 'Yelp Review: ' + data.error + '</p>';
            this.renderInfoWindow();
            return;
        }
        var formattedString = '',
            rating, ratingImg, ratingCount, yelpLink, yelpImage, yelpSnippet;

        rating = data.rating || 0;
        ratingImg = this.getRatingImg(rating);
        ratingCount = data.review_count || 0;
        yelpLink = data.url || "";
        yelpImage = data.image_url || "";
        if (yelpImage) {
            this.formatImage(yelpImage);
        }
        yelpSnippet = data.snippet_text || "";
        formattedString = '<a href="' + yelpLink + '" target="_blank">' + '<p>' + "Yelp Review: " + rating + ratingImg + '(' + ratingCount + ')' + '</p>' + '</a>';
        this.formattedInfoContent.yelp = formattedString;
        this.renderInfoWindow();
    },
    renderGoogleInfo: function (data) {
        if (data.error) {
            this.formattedInfoContent.google = '<p>' + 'Google Review: ' + data.error + '</p>';
            this.renderInfoWindow();
            return;
        }
        var formattedString = '',
            rating, ratingImg, ratingCount, googleLink, webAddress;

        rating = data.rating || 0;
        if(!data.rating){
            rating = "";
            ratingImg = "No Rating";
        }else{
            rating = data.rating;
            ratingImg = this.getRatingImg(rating);
        }
        ratingCount = data.reviews ? data.reviews.length : 0;
        googleLink = data.url || "";
        webAddress = data.website || "";
        if (ratingCount >= 5) {
            ratingCount = ">5";
        }
        formattedString = '<a href="' + googleLink + '" target="_blank">' + '<p>' + "Google Review: " + rating + ratingImg + '(' + ratingCount + ')' + '</p>' + '</a>';
        this.formattedInfoContent.google = formattedString;
        if (webAddress) {
            this.formattedInfoContent.title = '<a href="' + webAddress + '" target="_blank">' + this.formattedInfoContent.title + '</a>';
        }
        this.renderInfoWindow();
    },
    getRatingImg: function (rating) {
        var fullStar = "&#9733;",
            halfStar = "&#10030;",
            emptyStar = "&#9734;";
        if (rating === 0) {
            return emptyStar + emptyStar + emptyStar + emptyStar + emptyStar;
        } else if (rating < 1) {
            return halfStar + emptyStar + emptyStar + emptyStar + emptyStar;
        } else if (rating === 1) {
            return fullStar + emptyStar + emptyStar + emptyStar + emptyStar;
        } else if (rating < 2) {
            return fullStar + halfStar + emptyStar + emptyStar + emptyStar;
        } else if (rating === 2) {
            return fullStar + fullStar + emptyStar + emptyStar + emptyStar;
        } else if (rating < 3) {
            return fullStar + fullStar + halfStar + emptyStar + emptyStar;
        } else if (rating === 3) {
            return fullStar + fullStar + fullStar + emptyStar + emptyStar;
        } else if (rating < 4) {
            return fullStar + fullStar + fullStar + halfStar + emptyStar;
        } else if (rating === 4) {
            return fullStar + fullStar + fullStar + fullStar + emptyStar;
        } else if (rating < 5) {
            return fullStar + fullStar + fullStar + fullStar + halfStar;
        } else {
            return fullStar + fullStar + fullStar + fullStar + fullStar;
        }
    },
    formatPhone: function (phone) {
        if (phone.length === 11 && phone[0] === 1) {
            return ' (' + phone.substring(1, 4) + ') ' + phone.substring(4, 7) + '-' + phone.substring(7);
        } else if (phone.length === 10) {
            return ' (' + phone.substring(0, 3) + ') ' + phone.substring(3, 6) + '-' + phone.substring(6);
        }
    },
    formatImage: function (img) {
        this.formattedInfoContent.img = '<div id="image">' + '<img src="' + img + '">' + '</div>';
    },
};

viewModel.applyBinding();