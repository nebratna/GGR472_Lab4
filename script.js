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
    style: 'mapbox://styles/nebratna/clf2y6xcs002r01o5kcpwugoc',  //****ADD MAP STYLE HERE *****
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
            'circle-radius': 3,
            'circle-color': 'red'
        }
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

    let hexgeojson = turf.hexGrid(bboxscaledcoords, 0.5, { units: 'kilometers' });

    // map.addSource('bboxscaled-collis-hex-grid', {
    //     type: 'geojson',
    //     data: hexgeojson
    // });

    // map.addLayer({
    //     'id': 'bboxscaled-hex-grid-layer',
    //     'type': 'fill',
    //     'source': 'bboxscaled-collis-hex-grid',
    //     'paint': {
    //         'fill-color': 'grey',
    //         'fill-opacity': 0.4,
    //         'fill-outline-color': 'white'
    //     }
    // });



    /*--------------------------------------------------------------------
    Step 4: AGGREGATE COLLISIONS BY HEXGRID
    --------------------------------------------------------------------*/
    //HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
    //      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty

    let collishex = turf.collect(hexgeojson, collisionsgeojson, '_id', 'values'); //groups all _id by pollygon

    //count the number of features inside each hexagon, and identify maximum value

    let maxcollis = 0;

    collishex.features.forEach((feature) => { //initiating a method that loops through every single hexigon in collishex 
        feature.properties.COUNT = feature.properties.values.length // creates a new property field called COUNT that counts the number of _id that are collected within a pollygon
        if (feature.properties.COUNT > maxcollis) { // loops through all hexagons until it finds the highest COUNT value
            // console.log(feature);
            maxcollis = feature.properties.COUNT // if the COUNT is greater than the existing maxcollis the new maxcollis is assigned
        }
    })
    console.log(maxcollis); // to see what the highest number of collisions in a single hexigon is = 55

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
        'paint': {
            'fill-color': [
                'step',
                ['get', 'COUNT'],
                '#800026',
                10, '#bd0026',
                25, '#e31a1c'
            ],
            'fill-opacity': 0.4,
            'fill-outline-color': 'white'
        }
    });
});