//  VARIABLES  //
//Initialize the cities to 5 large cities
var cities= [
  "New York",
  "San Francisco",
  "San Diego",
  "Los Angeles",
  "Chicago"
];

//5 common Eventbrite categories that most big cities have data for
var eventCategories = [
  "travel",
  "food",
  "music",
  "entertainment",
  "sports"
];

var sequences = [];
var colors = {};

// Dimensions of graph
var width = 750;
var height = 600;
var radius = Math.min(width, height) / 2;


//  FUNCTIONS  //

/*------------------------------------------------------------
Function that uses the user app key to retrieve data about events,
based on provided cities and categories
------------------------------------------------------------*/
function getEventData(params) {
  var city = params.city;
  var category = params.category;
  Eventbrite({'app_key': "X3BFA4OALY2V3YFFD2" },
     function(eb_client) {
    	 // search for events & provide
       // callback fn to handle the response data
       eb_client.event_search( params,
          function(response) {
            // build the sequence name
            var curSequenceName = city + "-" + category;
            // add the sequence to the array
            if (response.events.length===0){
              sequences.push([curSequenceName, 0]);
            } else {
              sequences.push([curSequenceName, response.events[0].summary.total_items]);
            }
            if (sequences.length === cities.length*eventCategories.length) {
              console.log(sequences);
              var json = buildHierarchy(sequences);

              createVisualization(json);
              printErrors();
            }
       });
  });
};

/*------------------------------------------------------------
Creates each component of the graph using getEventData fn
------------------------------------------------------------*/
function initGraph() {
  sequences = [];
  initColors();
  for (var i=0; i<cities.length; i++) {
    for (var j=0; j<eventCategories.length;j++) {
      getEventData({"city": cities[i], "category": eventCategories[j], "count_only": false});
    }
  }
}
//Create the graph
initGraph();


// VARIABLES post-data-loading //
// Total size of all segments; set this later, after loading the data.
var totalSize = 0;

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

// FUNCTIONS, continued //
/*------------------------------------------------------------
Function that assigns colors to each city and category
------------------------------------------------------------*/
function initColors() {
  // Map steps in sequences to colors.
  colors = {};
  var cityColors = [
    "#3291B1",
    "#8DDF00",
    "#00D0FE",
    "#007DEB",
    "#01BE88",
  ];
  var eventColors = [
    "#F2C545",
    "#D77624",
    "#C13F47",
    "#731115",
    "#7D5E18"
  ];
  // go through list of cities and set city attribute equal to a color
  for (var i = 0; i < cities.length; i++) {
    colors[cities[i]] = cityColors[i];
  }
  // go through list of event categories and set attribute equal to a color
  for (var i = 0; i < eventCategories.length; i++) {
    colors[eventCategories[i]] = eventColors[i];
  }
};

/*------------------------------------------------------------
Updates the cities using the form input
Replaces the elements of var cities with those entered in the form
------------------------------------------------------------*/
function updateCities(){
  //Create array with form inputs
  var formInput=[
    $("#city1 select").val(),
    $("#city2 select").val(),
    $("#city3 select").val(),
    $("#city4 select").val(),
    $("#city5 select").val()
  ];
  cities=[];

  //update cities using this new array
  for (var i=0;i<5;i++){
    if (formInput[i] !== 'nocity'){
      if (cities.indexOf(formInput[i]) < 0) {
        cities.push(formInput[i]);
      }
    }
  }
}


/*------------------------------------------------------------
Prints out which city-category pairs have no recorded events
------------------------------------------------------------*/
function printErrors(){
  var errorString="No events found for ";
  var errorCounter=0;
  for (var i=0;i<sequences.length;i++){
    if (sequences[i][1]===0){
      errorString += sequences[i][0]+', ';
      errorCounter += 1;
    }
  }
  if (errorCounter !== 0){
    $("#errormsg").text(errorString);
  } else {
    $("#errormsg").text('');
  }
}

/*------------------------------------------------------------
// Main function to draw and set up the visualization, once we have the data.
------------------------------------------------------------*/
function createVisualization(json) {
  // Basic setup of page elements.
  drawLegend();
  d3.select("#togglelegend").on("click", toggleLegend);

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
      .attr("r", radius)
      .style("opacity", 0);

  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition.nodes(json)
      .filter(function(d) {
      return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
      });

  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .style("fill", function(d) { return colors[d.name]; })
      .style("opacity", 1)
      .on("mouseover", mouseover)
      .on("click", mouseclick);

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.node().__data__.value;
};

/*------------------------------------------------------------
// Fade all but the current sequence, and show it in the breadcrumb trail.
------------------------------------------------------------*/
function mouseover(d) {
  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  d3.select("#percentage")
      .text(percentageString);

  d3.select("#explanation")
      .style("visibility", "");

  if (d.depth===1){
    d3.select("#location")
      .text(d.name)
      .style("color",colors[d.name]);
    d3.select("#category")
      .text('');
    d3.select("#catinfo")
      .style("visibility","hidden");
  } else if (d.depth===2){
    d3.select("#location")
      .text(d.parent.name)
      .style("color",colors[d.parent.name]);
    d3.select("#catinfo")
      .style("visibility","visible");
    d3.select("#category")
      .text(d.name)
      .style("color",colors[d.name]);
  }

  var sequenceArray = getAncestors(d);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}

/*------------------------------------------------------------
 Restore everything to full opacity when moving off the visualization.
------------------------------------------------------------*/
function mouseleave(d) {
  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .each("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });
  //Hide the middle percentage listings
  d3.select("#explanation")
      .style("visibility", "hidden");
  d3.select("#catinfo")
      .style("visibility","hidden");
}

/*------------------------------------------------------------
Given a node in a partition layout, return an array of all of its ancestor
nodes, highest first, but excluding the root.
------------------------------------------------------------*/
function getAncestors(node) {
  var path = [];
  var current = node;
  while (current.parent) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}

/*------------------------------------------------------------
Creates the legend on the right side, which is hidden unless
toggled with the "View Legend" button
------------------------------------------------------------*/
function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 90, h: 30, s: 3, r: 3
  };

  var legend = d3.select("#legend").append("svg:svg")
      .attr("width", li.w)
      .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colors))
      .enter().append("svg:g")
      .attr("transform", function(d, i) {
              return "translate(0," + i * (li.h + li.s) + ")";
           });

  g.append("svg:rect")
      .attr("rx", li.r)
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.value; });

  g.append("svg:text")
      .attr("x", li.w / 2)
      .attr("y", li.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.key; });
}

/*------------------------------------------------------------
Clears the graph - used when form is submitted
------------------------------------------------------------*/
function clearChart(){
  d3.selectAll("svg").remove();
  totalSize=0;
  vis = d3.select("#chart").append("svg:svg")
      .attr("width", width)
      .attr("height", height)
      .append("svg:g")
      .attr("id", "container")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  partition = d3.layout.partition()
      .size([2 * Math.PI, radius * radius])
      .value(function(d) { return d.size; });

  arc = d3.svg.arc()
      .startAngle(function(d) { return d.x; })
      .endAngle(function(d) { return d.x + d.dx; })
      .innerRadius(function(d) { return Math.sqrt(d.y); })
      .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });
}

/*------------------------------------------------------------
Shows/hides the legend
------------------------------------------------------------*/
function toggleLegend() {
  var legend = d3.select("#legend");
  var sidebar = $("#sidebar");
  var btn = $('#legendbtn');
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "visible");
    sidebar.addClass('slide-in-right');
    btn.text('Hide Legend');
  } else {
    sidebar.removeClass('slide-in-right');
    sidebar.addClass('slide-out-right');
    setTimeout(function() {
      sidebar.css('visibility','hidden');
      sidebar.removeClass('slide-out-right');
      btn.text('Show Legend');
      legend.style("visibility", "hidden");
    }, 500);
  }
}

/*------------------------------------------------------------
Builds the city-category hierarchy
-----------------------------------------------------------*/
function buildHierarchy(csv) {
  var root = {"name": "root", "children": []};
  for (var i = 0; i < csv.length; i++) {
    var sequence = csv[i][0];
    var size = +csv[i][1];
    if (isNaN(size)) { // e.g. if this is a header row
      continue;
    }
    var parts = sequence.split("-");
    var currentNode = root;
    for (var j = 0; j < parts.length; j++) {
      var children = currentNode["children"];
      var nodeName = parts[j];
      var childNode;
      if (j + 1 < parts.length) {
   // Not yet at the end of the sequence; move down the tree.
 	var foundChild = false;
 	for (var k = 0; k < children.length; k++) {
 	  if (children[k]["name"] == nodeName) {
 	    childNode = children[k];
 	    foundChild = true;
 	    break;
 	  }
 	}
  // If we don't already have a child node for this branch, create it.
 	if (!foundChild) {
 	  childNode = {"name": nodeName, "children": []};
 	  children.push(childNode);
 	}
 	currentNode = childNode;
      } else {
 	// Reached the end of the sequence; create a leaf node.
 	childNode = {"name": nodeName, "size": size};
 	children.push(childNode);
      }
    }
  }
  return root;
};


/*
------------------------------------------------------------
Function to activate form button to open the slider.
------------------------------------------------------------
*/
function openPanel() {
  // console.log("openPanel");
  var panel = $(".slider");
  var btn = $(".slide-button");
  // change button to say hide
  btn.text("Hide Form");
  // set click to close-panel
  btn.attr("onclick", "closePanel()");
  // turn on the animation
  panel.css("display", "block");
  panel.addClass("slide-it-in");
}

/*------------------------------------------------------------
Function to activate form button to close the slider.
------------------------------------------------------------
*/
function closePanel() {
    var btn = $(".slide-button");
    var panel = $(".slider");
    console.log(btn)
    panel.removeClass("slide-it-in");
    panel.addClass("slide-it-out");
    setTimeout(function() {
      panel.css("display", "none");
      panel.removeClass("slide-it-out");
      btn.attr("onclick", "openPanel()");
      btn.text("Show Form");
    }, 500);
}

/*------------------------------------------------------------
Function to activate form button to close the slider;
Recreates the graph from the provided cities on the form
------------------------------------------------------------
*/
function submit(){
  var btn = $(".slide-button");
  var panel = $(".slider");
  console.log(btn)
  panel.removeClass("slide-it-in");
  panel.addClass("slide-it-out");
  setTimeout(function() {
    panel.css("display", "none");
    panel.removeClass("slide-it-out");
    btn.attr("onclick", "openPanel()");
    btn.text("Show Form");
  }, 500);
  updateCities();
  clearChart();
  initGraph();
}

/*------------------------------------------------------------
Function that, when the mouse is clicked, records city and category
and displays the corresponding events.
------------------------------------------------------------
*/
function mouseclick(d) {
  var curState;
  var curCategory;
  // show details if on outer ring
  if (d.depth === 2) {
     showEventsDetails( d.parent.name, d.name)
  }
}

/*------------------------------------------------------------
Displays at most 10 upcoming events for the provided city & category
------------------------------------------------------------
*/
function showEventsDetails (city, category) {
  openDetails();
  // capitalize for the title
  var curCity = city.charAt(0).toUpperCase() + city.slice(1);
  var curCategory = category.charAt(0).toUpperCase() + category.slice(1);

  // update our html with the header
   $('.details-header').html(curCity + " " + curCategory + " Events");

  // call eventbrite to get details
  Eventbrite({'app_key': "X3BFA4OALY2V3YFFD2" },
     function(eb_client) {
       // search for events & provide
       // callback fn to handle the response data
       eb_client.event_search( {"city": city, "category": category},
          function(response) {
            // this displays event details
            console.log('back from search: ', response);
            $(".details-target").html( eb_client.utils.eventList( response, eb_client.utils.eventListRow ));

       }); // event_search
  }); // Eventbrite

}

/*------------------------------------------------------------
Opens a pop-up with the corresponding event details
------------------------------------------------------------
*/
function openDetails() {
  var panel = $(".details");
  var btn = $(".details-button");
  // set click to close-panel
  btn.attr("onclick", "closeDetails()");
  // turn on the animation
  panel.css("visibility", "visible");
  panel.addClass("zoom-in");
};

/*------------------------------------------------------------
Closes out event details pop-up (i.e. when "close" is clicked)
------------------------------------------------------------
*/
function closeDetails() {
    var panel = $(".details");
    panel.removeClass("zoom-in");
    panel.addClass("zoom-out");
    setTimeout(function() {
      panel.css("visibility", "hidden");
      panel.removeClass("zoom-out");
    }, 500);

};

//jQuery for the tooltip
$('#instr').hover(function(){
  $('#useInstr').fadeIn();
},
function(){
  $('#useInstr').fadeOut();
});
