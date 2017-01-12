/* global google */
/* global _ */
/**
 * scripts.js
 *
 * Computer Science 50
 * Problem Set 8
 *
 * Global JavaScript.
 */

// Google Map
var map;

// markers for map
var markers = [];
var labels = [];

var bounceTimer;

// info window
var info = new google.maps.InfoWindow();

// execute when the DOM is fully loaded
$(function() {

    // styles for map
    // https://developers.google.com/maps/documentation/javascript/styling
    var styles = [

        // hide Google's labels
        {
            featureType: "all",
            elementType: "labels",
            stylers: [
                {visibility: "off"}
            ]
        },

        // hide roads
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [
                {visibility: "off"}
            ]
        }

    ];

    // options for map
    // https://developers.google.com/maps/documentation/javascript/reference#MapOptions
    var options = {
        center: {lat: 28.0662, lng: -82.7585}, // Palm Harbor, Florida
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        maxZoom: 14,
        panControl: true,
        styles: styles,
        zoom: 13,
        zoomControl: true
    };

    // get DOM node in which map will be instantiated
    var canvas = $("#map-canvas").get(0);

    // instantiate map
    map = new google.maps.Map(canvas, options);

    // configure UI once Google Map is idle (i.e., loaded)
    google.maps.event.addListenerOnce(map, "idle", configure);

});

/**
 * Adds marker for place to map.
 */
function addMarker(place)
{

    //get content for marker's info window
    var content;  
    var parameters = {
        geo: place.postal_code
    };
    
    //parse json object for content
    $.getJSON("articles.php", parameters)
    .done(function(data, textStatus, jqXHR) {

        //set info window format
        content = '<ul>';
        
        var count = 0;
        
        //add each link to to contnet
        data.forEach(function(entry){
            content += '<li><a href=' + entry.link + '>' + entry.title + '</a></li>';
            count++;
        });
        
        
        content += '<li>There are ' + count + ' news stories in this area.</li></ul>';
    })
    
    .fail(function(jqXHR, textStatus, errorThrown) {

        // log error to browser's console
        console.log(errorThrown.toString());
    });
    
    //get coordinate and convert into numbers
    var myLatLng = {lat: Number(place.latitude), lng: Number(place.longitude)};
   
    //make marker
    markers.push(new google.maps.Marker({
    position: myLatLng,
    map: map,
    icon: 'https://ide50-diraj.cs50.io/images/default.png',
    title: place.place_name,
    animation: null
    }));
  
    //remember index of current marker
    var index = markers.length - 1;

    //make a text label under the marker
    labels.push(new MapLabel({
       text: place.place_name + ', ' + place.admin_name1,
       position: new google.maps.LatLng(place.latitude, place.longitude),
       map: map,
       fontFamily: 'Arial',
       fontSize: 20,
       strokeColor: '#000000',
       strokeWeight: 0
    }));
  
  
    //display infowindow when clicked
    markers[index].addListener('click', function() {
        hideInfo();
        showInfo(markers[index], content);
    });
    
    markers[index].addListener('mouseover', function() {

        if(markers[index].getAnimation() == null){
            
            clearTimeout(bounceTimer);
            
            bounceTimer = setTimeout(function(){
                markers[index].setAnimation(google.maps.Animation.BOUNCE);
            }, 500);
            
        }
    });
    
    markers[index].addListener('mouseout', function() {
        
        if(markers[index].getAnimation() != null){
                markers[index].setAnimation(null);
        }
        
        //clear timer since we aren't over it anymore
        clearTimeout(bounceTimer);
        
    });
    
}

/**
 * Configures application.
 */
function configure()
{
    // update UI after map has been dragged
    google.maps.event.addListener(map, "dragend", function() {
        update();
    });

    // update UI after zoom level changes
    google.maps.event.addListener(map, "zoom_changed", function() {
        update();
    });

    // remove markers whilst dragging
    google.maps.event.addListener(map, "dragstart", function() {
        removeMarkers();
    });

    // configure typeahead
    // https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md
    $("#q").typeahead({
        autoselect: true,
        highlight: true,
        minLength: 1
    },
    {
        source: search,
        templates: {
            empty: "no places found yet",
            suggestion: _.template("<p><%- place_name %>, <%- admin_name1 %>, <%-postal_code %></p>")
        }
    });

    // re-center map after place is selected from drop-down
    $("#q").on("typeahead:selected", function(eventObject, suggestion, name) {

        // ensure coordinates are numbers
        var latitude = (_.isNumber(suggestion.latitude)) ? suggestion.latitude : parseFloat(suggestion.latitude);
        var longitude = (_.isNumber(suggestion.longitude)) ? suggestion.longitude : parseFloat(suggestion.longitude);

        // set map's center
        map.setCenter({lat: latitude, lng: longitude});

        // update UI
        update();
    });

    // hide info window when text box has focus
    $("#q").focus(function(eventData) {
        hideInfo();
    });

    // re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
    // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
    document.addEventListener("contextmenu", function(event) {
        event.returnValue = true; 
        event.stopPropagation && event.stopPropagation(); 
        event.cancelBubble && event.cancelBubble();
    }, true);

    // update UI
    update();

    // give focus to text box
    $("#q").focus();
}

/**
 * Hides info window.
 */
function hideInfo()
{
    info.close();
}

/**
 * Removes markers from map.
 */
function removeMarkers()
{
    //remove markers from the map
    for (var i = 0; i < markers.length; i++) {
          markers[i].setMap(null);
        }
        
    //remove markers from memory
    markers = [];
    
    for (var i = 0; i < labels.length; i++) {
        labels[i].onRemove();
    }
    
    labels = [];
}

/**
 * Searches database for typeahead's suggestions.
 */
function search(query, cb)
{
    // get places matching query (asynchronously)
    var parameters = {
        geo: query
    };
    $.getJSON("search.php", parameters)
    .done(function(data, textStatus, jqXHR) {

        // call typeahead's callback with search results (i.e., places)
        cb(data);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {

        // log error to browser's console
        console.log(errorThrown.toString());
    });
}

/**
 * Shows info window at marker with content.
 */
function showInfo(marker, content)
{
    // start div
    var div = "<div id='info'>";
    if (typeof(content) === "undefined")
    {
        // http://www.ajaxload.info/
        div += "<img alt='loading' src='img/ajax-loader.gif'/>";
    }
    else
    {
        div += content;
    }

    // end div
    div += "</div>";

    // set info window's content
    info.setContent(div);

    // open info window (if not already open)
    info.open(map, marker);
}

/**
 * Updates UI's markers.
 */
function update() 
{
    // get map's bounds
    var bounds = map.getBounds();
    var ne = bounds.getNorthEast();
    var sw = bounds.getSouthWest();

    // get places within bounds (asynchronously)
    var parameters = {
        ne: ne.lat() + "," + ne.lng(),
        q: $("#q").val(),
        sw: sw.lat() + "," + sw.lng()
    };
    $.getJSON("update.php", parameters)
    .done(function(data, textStatus, jqXHR) {

        // remove old markers from map
        removeMarkers();

        // add new markers to map
        for (var i = 0; i < data.length; i++)
        {
            addMarker(data[i]);
        }
     })
     .fail(function(jqXHR, textStatus, errorThrown) {

         // log error to browser's console
         console.log(errorThrown.toString());
     });
}

/**
 * selects an appropropriate icon for the marker depending on the news.
 */
function pickIcon(place){
    
    var image = 'https://ide50-diraj.cs50.io/images/';
            /*
            switch(parsed[i]) {
                case 'explosion', 'blast':
                    keyword = 'blast.png';
                    break;
                case 'bomb', 'dynamite', 'warhead', 'missile':
                    keyword = 'bomb.png';
                    break;
                case 'car accident', 'car crash':
                    keyword = 'caraccident.png';
                    break;
                case 'cow abduction':
                    keyword = 'cowabduction.png';
                    break;
                case 'murder', 'kill', 'assassination', 'death':
                    keyword = 'crimescene.png';
                    break;
                case 'crop circle', 'crop circles', 'agroglyph':
                    keyword = 'cropcircles.png';
                    break;
                case 'earthquake', 'fault line':
                    keyword = 'earthquake-3.png';
                    break;
                case 'fire', 'blaze', 'burn', 'flames':
                    keyword = 'fire.png';
                    break;
                case 'flood', 'flooding':
                    keyword = 'flood.png';
                    break;
                case 'line down', 'line cut', 'power cut':
                    keyword = 'linedown.png';
                    break;
                case 'end of ware', 'treaty', 'armistice':
                    keyword = 'peace.png';
                    break;
                case 'phantom', 'haunted', 'spook', 'house':
                    keyword = 'phantom.png';
                    break;
                case 'pirates','piracy':
                    keyword = 'pirates.png';
                    break;
                case 'plane crash', 'aviation accident':
                    keyword = 'planecrash.png';
                    break;
                case 'power outage', 'black out', 'power failure':
                    keyword = 'poweroutage.png';
                    break;
                case 'radiation', 'decontamination', 'nuclear', 'uranium':
                    keyword = 'radiation.png';
                    break;
                case 'rape', 'abuse', 'mistreatment':
                    keyword = 'rape.png';
                    break;
                case 'rescue', 'saved':
                    keyword = 'rescue.png';
                    break;
                case 'revolt', 'overthrow', 'revolution':
                    keyword = 'revolt.png';
                    break;
                case 'robbery', 'snatching', 'burglary':
                    keyword = 'robbery.png';
                    break;
                case 'shark', 'shark attack':
                    keyword = 'shark-export.png';
                    break;
                case 'gun', 'weapon', 'firearm', 'handgun':
                    keyword = 'shooting.png';
                    break;
                case 'strike', 'protest':
                    keyword = 'strike.png';
                    break;
                case 'tornado', 'twister', 'cyclone', 'hurricane':
                    keyword = 'tornado-2.png';
                    break;
                case 'torture', 'punishment', 'pain':
                    keyword = 'torture.png';
                    break;
                case 'tree down', 'uprooted':
                    keyword = 'treedown.png';
                    break;
                case 'tsunami', 'wave':
                    keyword = 'tsuname.png';
                    break;
                case 'UFO', 'flying saucer':
                    keyword = 'ufo.png';
                    break;
                case 'war', 'battle':
                    keyword = 'war.png';
                    break;
                case 'wedding':
                    keyword = 'wedding.png';
                    break;
                case 'zombie':
                    keyword = 'zombie-outbreak1.png';
                    break;
                default:
                    console.log('no keyword found on loop ' + i);
                }
                */
                
        return image += 'default.png';
}