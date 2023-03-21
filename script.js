/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/


/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
//Define access token
mapboxgl.accessToken = 'pk.eyJ1IjoibmVicmF0bmEiLCJhIjoiY2xjdmZ6Z3I0MDdoODNycWtvNDVuYjJydCJ9.MU8-uPe3u6ya0aTiMr079g'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

//Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', //container id in HTML
    style: 'mapbox://styles/nebratna/clfhcbuja009501pdvnf1gquj',  //****ADD MAP STYLE HERE *****
    center: [-79.39, 43.7056],  // starting point, longitude/latitude
    zoom: 10 // starting zoom level
});

//Adding zoom and rotation controls to the map
map.addControl(new mapboxgl.NavigationControl());

/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable

let collisionsgeojson; //new empty variable

fetch('https://raw.githubusercontent.com/nebratna/GGR472_Lab4/main/data/pedcyc_collision_06-21.geojson') // accessed GeoJSON via GitHub, clicked on GeoJSON in the data folder and then on RAW button which should appear, if it does not reload the GeoJSON file once more
    .then(response => response.json()) //converts the response to JSON format
    .then(response => {
        console.log(response); //Checking response in console
        collisionsgeojson = response; //Store GeoJSON as variable using URL from fetch response
    });

//Load data to map using GeoJSON as variable

map.on('load', () => {

    //Add datasource using GeoJSON variable
    map.addSource('collisions-TO', {
        type: 'geojson',
        data: collisionsgeojson
    });

    map.addLayer({
        'id': 'collisions-TO-layer',
        'type': 'circle',
        'source': 'collisions-TO',
        'paint': {
            'circle-radius': 2,
            'circle-color': 'black'
        },
    });

    //Add layer with Pedestrian-involved collisions 
    map.addLayer({
        'id': 'involvmenttype-layer',
        'type': 'circle',
        'source': 'collisions-TO',
        'paint': {
            'circle-radius': 2,
            'circle-color': 'red'
        },
        'filter':
            ['==', ['get', 'INVTYPE'], 'Pedestrian'],
    });

});

/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      First create a bounding box around the collision point data then store as a feature collection variable
//      Access and store the bounding box coordinates as an array variable
//      Use bounding box coordinates as argument in the turf hexgrid function

map.on('load', () => {
    let bboxgeojson;
    let bbox = turf.envelope(collisionsgeojson); //using turf to create an 'envelope' (bounding box) around points
    let bboxscaled = turf.transformScale(bbox, 1.10); //scale bbox up by 10%

    //put the resulting envelope in a GeoJSON format FeatureCollection
    bboxgeojson = {
        "type": "FeatureCollection",
        "features": [bboxscaled]
    };

    // map.addSource('collisions-box', {  //uncomment to visualize the bounding box
    //     type: 'geojson',
    //     data: bboxgeojson
    // });

    // map.addLayer({
    //     'id': 'collisions-box-layer',
    //     'type': 'fill',
    //     'source': 'collisions-box',
    //     'paint': {
    //         'fill-color': 'grey',
    //         'fill-opacity': 0.5,
    //         'fill-outline-color': 'black'
    //     }
    // });

    //CREATING A HEXGRID

    //exploring the bbox output first in the console
    console.log(bbox);
    console.log(bbox.geometry.coordinates);
    console.log(bbox.geometry.coordinates[0][0][0]); //minX
    console.log(bbox.geometry.coordinates[0][0][1]); //minY
    console.log(bbox.geometry.coordinates[0][1][0]); //maxX
    console.log(bbox.geometry.coordinates[0][2][1]); //maxY

    //exploring the bbox scaled output in the console
    console.log(bboxscaled);

    let bboxscaledcoords = [  //creating a variable to store bbox coordinates in the order minX, minY, maxX, maxY
        bboxscaled.geometry.coordinates[0][0][0],
        bboxscaled.geometry.coordinates[0][0][1],
        bboxscaled.geometry.coordinates[0][1][0],
        bboxscaled.geometry.coordinates[0][2][1]
    ];

    let hexgeojson = turf.hexGrid(bboxscaledcoords, 1.0, { units: 'kilometers' });


    /*--------------------------------------------------------------------
    Step 4: AGGREGATE COLLISIONS BY HEXGRID
    --------------------------------------------------------------------*/
    //HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
    //      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty

    let collishex = turf.collect(hexgeojson, collisionsgeojson, '_id', 'values'); //groups all _id by pollygon

    //count the number of features inside each hexagon, and identify maximum value

    let maxcollis = 0; //highest collission number
    let sum = 0; //sum of all collissions
    let mean = 0; //mean of all collisions
    let summeansq = 0; //(x- mean)squared, used to calculate standard deviation of collisions
    let num = 0; //count of all collisions

    collishex.features.forEach((feature) => { //initiating a method that loops through every single hexigon in collishex 
        feature.properties.COUNT = feature.properties.values.length // creates a new property field called COUNT that counts the number of _id that are collected within a pollygon
        if (feature.properties.COUNT > maxcollis) { // loops through all hexagons until it finds the highest COUNT value
            // console.log(feature);
            maxcollis = feature.properties.COUNT // if the COUNT is greater than the existing maxcollis the new maxcollis is assigned
        }
    })

    // Calculating standard deviation of COUNT

    collishex.features.forEach((feature) => {
        if (feature.properties.COUNT > 0) {
            sum += feature.properties.COUNT
        }
    })

    mean = sum / 158

    collishex.features.forEach((feature) => {
        if (feature.properties.COUNT > 0) {// excluding most of the hex boxes that are on the water, only 2 with 0 in TO
            summeansq += (feature.properties.COUNT - mean) * (feature.properties.COUNT - mean)
        }
    })

    collishex.features.forEach((feature) => {
        if (feature.properties.COUNT > 0) {
            num += 1
        }
    })

    stdev = (summeansq / num) ** 0.5

    console.log(maxcollis); // to see what the highest number of collisions in a single hexigon is = 55
    console.log(collishex);
    console.log(sum);
    console.log(mean);
    console.log(summeansq);
    console.log(num);
    console.log(stdev);


    // /*--------------------------------------------------------------------
    // Step 5: FINALIZE YOUR WEB MAP
    // --------------------------------------------------------------------*/
    //HINT: Think about the display of your data and usability of your web map.
    //      Update the addlayer paint properties for your hexgrid using:
    //        - an expression
    //        - The COUNT attribute
    //        - The maximum number of collisions found in a hexagon
    //      Add a legend and additional functionality including pop-up windows




    map.addSource('collis-count-hex-grid', {
        type: 'geojson',
        data: collishex
    });


    map.addLayer({
        'id': 'collis-count-hex-grid-layer',
        'type': 'fill',
        'source': 'collis-count-hex-grid',
        'paint':
        {
            'fill-color':
                ['step', 
                    ['get', 'COUNT'],
                    '#f1eef6', // Colour assigned to any values < first step
                    1, '#d4b9da', // Colours assigned to values >= each step; 
                    22, '#c994c7', // 1 standard deviation
                    42, '#df65b0', // 2 standard deviations
                    62, '#980043' // 3 standard deviations
                ],
            'fill-opacity': 0.6,
            'fill-outline-color': 'white',
        },
    });
});

/*-----------------------------------------------------------------
ADDING MOUSE CLICK EVENT FOR LAYER
-----------------------------------------------------------------*/

// Change the cursor to a pointer when the mouse is over the collis-count-hex-grid-layer layer.
map.on('mouseenter', 'collis-count-hex-grid-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
});

// Change it back to a pointer when it leaves.
map.on('mouseleave', 'collis-count-hex-grid-layer', () => {
    map.getCanvas().style.cursor = '';
});

map.on('click', 'collis-count-hex-grid-layer', (e) => {
    new mapboxgl.Popup() //Declare new popup object on each click
        .setLngLat(e.lngLat) //Use method to set coordinates of popup based on mouse click location
        .setHTML("<b>Number of collisions:</b> " + "<br>" + e.features[0].properties.COUNT) //Use click event properties to write text for popup
        .addTo(map); //Show  popup on map
});

/*--------------------------------------------------------------------
ADDING MAPBOX CONTROLS AS ELEMENTS ON MAP
--------------------------------------------------------------------*/
//Create geocoder variable
const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    countries: "ca"
});

//Use geocoder div to position geocoder on page
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

//Add fullscreen option to the map
map.addControl(new mapboxgl.FullscreenControl());


/*--------------------------------------------------------------------
ADDING INTERACTIVITY BASED ON HTML EVENT
--------------------------------------------------------------------*/

//Add event listeneer which returns map view to full screen on button click
document.getElementById('returnbutton').addEventListener('click', () => {
    map.flyTo({
        center: [-79.39, 43.7056],
        zoom: 10,
        essential: true
    });
});

//Change display of legend based on check box
let legendcheck = document.getElementById('legendcheck');

legendcheck.addEventListener('click', () => {
    if (legendcheck.checked) {
        legendcheck.checked = true;
        legend.style.display = 'block';
    }
    else {
        legend.style.display = "none";
        legendcheck.checked = false;
    }
});

//Collisions, all checkbox
document.getElementById('collisionscheck').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'collisions-TO-layer',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
})

//Collisions, pedestrian checkbox
document.getElementById('collisionscheck-ped').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'involvmenttype-layer',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
})

//Hexagons checkbox
document.getElementById('hexagons').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'collis-count-hex-grid-layer',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
})