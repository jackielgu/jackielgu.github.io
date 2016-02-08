var corgi = {};

(function() {

  function avgColr(x, y, z, w) {
    return [
	  (x[0] + y[0] + z[0] + w[0]) / 4,
	  (x[1] + y[1] + z[1] + w[1]) / 4,
	  (x[2] + y[2] + z[2] + w[2]) / 4,
    ];
  };

  // constructs 2d array
  function array2d(w, h) {
    var a = [];
    return function(x, y, v) {
  	  if (arguments.length === 3) {
  	    // set
  	    return a[w * x + y] = v;
  	  } else if (arguments.length === 2) {
  	    // get
  	    return a[w * x + y];
  	  }
    }
  }

  // build the circle object!
  function Circle(svg, xi, yi, size, color, children, layer) {
    this.svg = svg;
    this.x = size * (xi + 0.5);
    this.y = size * (yi + 0.5);
    this.size = size;
    this.color = color;
    this.rgb = d3.rgb(color[0], color[1], color[2]);
    this.children = children;
    this.layer = layer;
  }

  Circle.prototype.isSplitable = function() {
    return this.node && this.children
  }

  Circle.prototype.split = function() {
    console.log("HELLO I AM SPLITTING");
    if (!this.isSplitable()) return;
    d3.select(this.node).remove();
    delete this.node;
    Circle.addToVis(this.svg, this.children);
  }

  Circle.addToVis = function(svg, circles, init) {
    var circle = svg.selectAll(".nope").data(circles)	// THIS IS WHERE IT GETS ALL THE CIRCLES!!
      .enter().append("circle");

    if (init) {
    	circle = circle
    	  .attr("cx", function(d) { return d.x; })
    	  .attr("cy", function(d) { return d.y; })
    	  .attr("r", 4)
    	  .attr("fill", "#ffffff")
    	    .transition()
    	    .duration(1200);
    } else {
    	circle = circle
    	  .attr("cx", function(d) { return d.parent.x; })
    	  .attr("cy", function(d) { return d.parent.y; })
    	  .attr('r', function(d) { return d.parent.size / 2; })
    	  .attr("fill", function(d) { return String(d.parent.rgb); })
    	  .attr("fill-opacity", 1)
    	    .transition()
    	    .duration(500);
    }

    // transition 
    circle
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .attr("r", function(d) { return d.size / 2; })
      .attr("fill", function(d) { return String(d.rgb); })
      .attr("fill-opacity", .9)
      .each("end", function(d) { d.node = this; });
  }

  // instantiate some important variables
  var svg,
    maxSize = 512,
    minSize = 4,
    dim = maxSize / minSize;

  // MAIN FUNCTION
  corgi.makeCircles = function(selector, colorData) {
    var splitableByLayer = [],
        splitableTotal = 0,
        nextPercent = 0;

    if (!svg) {
    	console.log("svg becomes something");
    	svg = d3.select(selector)
              .append("svg")
              .attr("width", maxSize)
              .attr("height", maxSize);
    } else {
    	svg.selectAll('circle')
    	   .remove();
    }
    console.log("made svg");

    var finestLayer = array2d(dim, dim);
    var size = minSize;

    // populate the base layer
    var i = 0;
    for (var yi = 0; yi < dim; yi++) {
    	for (var xi = 0; xi < dim; xi++) {
    	  var color = [colorData[i], colorData[i + 1], colorData[i + 2]];
    	  finestLayer(xi, yi, new Circle(svg, xi, yi, size, color));
    	  i += 4;
    	}
    }

    // build up successive layers
    var prevLayer = finestLayer;
    var currentLayer = 0;
    while (size < maxSize) {
    	dim = dim / 2;
    	size = size * 2;
    	var layer = array2d(dim, dim);
    	for (yi = 0; yi < dim; yi++) {
    	  for (xi = 0; xi < dim; xi++) {
    	  	var c1 = prevLayer(2 * xi, 2 * yi);
    	  	var c2 = prevLayer(2 * xi + 1, 2 * yi);
    	  	var c3 = prevLayer(2 * xi, 2 * yi + 1);
    	  	var c4 = prevLayer(2 * xi + 1, 2 * yi + 1);
    	  	color = avgColr(c1.color, c2.color, c3.color, c4.color);
    	  	c1.parent = c2.parent = c3.parent = c4.parent = layer(xi, yi, 
    	  	  new Circle(svg, xi, yi, size, color, [c1, c2, c3, c4], currentLayer));
    	  }
    	}
    	splitableByLayer.push(dim * dim);
    	splitableTotal += dim * dim;
    	currentLayer++;
    	prevLayer = layer;
    	//debugger;
    }

    // create initial circle
    Circle.addToVis(svg, [layer(0, 0)], true);
    console.log("created initial circle");

    
    function splitableCircleAt(pos) {
    	var xi = Math.floor(pos[0] / minSize),
    	    yi = Math.floor(pos[1] / minSize),
    	    circle = finestLayer(xi, yi);
    	if (!circle) return null;
    	while (circle && !circle.isSplitable()) circle = circle.parent;
    	return circle;
    }

    function intervalLength(startPoint, endPoint) {
    	var dx = endPoint[0] - startPoint[0];
    	var dy = endPoint[1] - startPoint[1];

    	return Math.sqrt(dx * dx + dy * dy);
    }

    function breakInterval(startPoint, endPoint, maxLength) {
    	var breaks = [];
    	var length = intervalLength(startPoint, endPoint);
    	var numSplits = Math.max(Math.ceil(length / maxLength), 1);
    	var dx = (endPoint[0] - startPoint[0]) / numSplits;
    	var dy = (endPoint[1] - startPoint[1]) / numSplits;
    	var startX = startPoint[0];
    	var startY = startPoint[1];

    	for (var i = 0; i <= numSplits; i++) {
    	  breaks.push([startX + dx * i, startY + dy * i]);
    	}
    	return breaks;
    }

    function findAndSplit(startPoint, endPoint) {
    	console.log("findandsplit");
    	var breaks = breakInterval(startPoint, endPoint, 10);
    	var circleToSplit = [];

    	for (var i = 0; i < breaks.length - 1; i++) {
    	  var sp = breaks[i];
    	  var ep = breaks[i + 1];
        // debugger;
    	  var circle = splitableCircleAt(ep);
    	  console.log(circle);
    	  if (circle && circle.isSplitable()) {
    	  	circle.split();
    	  	console.log("splitted");
    	  }
    	}
    }

    // mouse events
    var prevMousePosition = null;
    function onMouseMove() {
    	var mousePosition = d3.mouse(svg.node());

    	if (isNaN(mousePosition[0])) {
    	  prevMousePosition = null;
    	  return;
    	}

    	if (prevMousePosition) {
    	  findAndSplit(prevMousePosition, mousePosition);
    	}
    	prevMousePosition = mousePosition;
    	d3.event.preventDefault();
    }

    d3.select(document.body)
      .on('mousemove.corgi', onMouseMove);

    console.log("made circles!");

  };

  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");

  var loadImage = function(imageData) {
    ctx.drawImage(imageData, 0, 0, dim, dim);
    return ctx.getImageData(0, 0, dim, dim).data;
  };

  // var imageBank = ["images/corgi1.jpg", "images/corgi2.jpg", "images/corgi3.jpg",
  //                  "images/corgi4.jpg", "images/corgi5.jpg", "images/corgi6.jpg",
  //                  "images/corgi7.jpg", "images/corgi8.jpg", "images/corgi9.jpg",
  //                  "images/corgi10.jpg", "images/corgi11.jpg", "images/corgi12.jpg",
  //                  "images/corgi13.jpg", "images/corgi14.jpg", "images/corgi15.jpg",
  //                  "images/corgi16.jpg"
  //                 ];

  var imageBank = [
                   'https://dl.dropboxusercontent.com/s/4wci7r7zc3p451l/corgi2.jpg',
                   'https://dl.dropboxusercontent.com/s/yrm5o2jzy2qdhtd/corgi3.jpg',
                   'https://dl.dropboxusercontent.com/s/6yiye12jkkc4z08/corgi5.jpg',
                   'https://dl.dropboxusercontent.com/s/6vwg81hopw36x3x/corgi6.jpg',
                   'https://dl.dropboxusercontent.com/s/3awdsuwj62ndee3/corgi7.jpg',
                   'https://dl.dropboxusercontent.com/s/6exupcta4bk7c3q/corgi8.jpg',
                   'https://dl.dropboxusercontent.com/s/yypwabu72lbqwki/corgi9.jpg',
                   'https://dl.dropboxusercontent.com/s/cj4uzpp61cad2qh/corgi10.jpg',
                   'https://dl.dropboxusercontent.com/s/8xlxclm3websglg/corgi11.jpg',
                   'https://dl.dropboxusercontent.com/s/4cfdtxn9clr8nnf/corgi12.jpg',
                   'https://dl.dropboxusercontent.com/s/2qxcsya1x7q0pc4/corgi13.jpg',
                   'https://dl.dropboxusercontent.com/s/bsv4sai5l7tm34m/corgi14.jpg',
                   'https://dl.dropboxusercontent.com/s/w72gatzhfx6n9sp/corgi15.jpeg',
                   'https://dl.dropboxusercontent.com/s/2qx7jwp86xeipjy/corgi16.jpg'];
  
  var img = new Image();

  img.onload = function() {
    var colorData = loadImage(img);
    corgi.makeCircles("#dots", colorData);            
  };

  img.crossOrigin = 'anonymous';
  img.src = imageBank[Math.floor(Math.random() * imageBank.length)];
  //debugger;

})();


// corgi1: 'https://dl.dropboxusercontent.com/s/uci2sgfy5mwygxe/corgi1.jpg'
// corgi4: 'https://dl.dropboxusercontent.com/s/tfgjv86ws421exy/corgi4.jpg'
// 

