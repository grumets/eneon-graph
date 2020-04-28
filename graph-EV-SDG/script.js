 var graph       = {},
    selected    = {},
    highlighted = null,
    isIE        = false;

$(function() {
    resize();

    isIE = $.browser.msie;

    d3.json(config.jsonUrl, function(error, data) {

	if (error) return alert(error);

	graph.full_json_text=JSON.stringify(data, null, 4);
        graph.data = data.network;
        drawGraph();
    });

    $('#docs-close').on('click', function() {
        deselectObject();
        return false;
    });

    $(document).on('click', '.select-object', function() {
        var obj = findObjById(graph.data, $(this).data('name'));
        if (obj) {
            selectObject(obj);
        }
        return false;
    });

    $(document).on('click', '.nav-button', function() {
        showList(graph.data, $(this).data('name'));
        return false;
    });


    $(window).on('resize', resize);
});

function drawGraph() {
    $('#graph').empty();

    graph.margin = {
        top    : 20,
        right  : 20,
        bottom : 20,
        left   : 20
    };

    var display = $('#graph').css('display');
    $('#graph')
        .css('display', 'block')
        .css('width', config.graph.width + 'px')
	.css('height', config.graph.height + 'px');
    graph.width  = $('#graph').width()  - graph.margin.left - graph.margin.right;
    graph.height = $('#graph').height() - graph.margin.top  - graph.margin.bottom;
    $('#graph').css('display', display);

    if (typeof config.graph.includeAbbrNamespace != "undefined" && config.graph.includeAbbrNamespace==false)
    {
	//Removing namespaces (JM)
	for (var name in graph.data) {
            var obj = graph.data[name];
	    obj.id=removeAbbrNamespace(obj.id);
            for (var depIndex in obj.links) {
                if (depIndex=="source")
                {
		    obj.links[depIndex]=removeAbbrNamespace(obj.links[depIndex]);
		    continue;
                }
                for (var i_array in obj.links[depIndex])
                    obj.links[depIndex][i_array]=removeAbbrNamespace(obj.links[depIndex][i_array]);
            }
	}
    }

    for (var name in graph.data) {
        var obj = graph.data[name];
        obj.positionConstraints = [];
        obj.linkStrength        = 1;

        config.constraints.forEach(function(c) {
            for (var k in c.has) {
                if (c.has[k] !== obj[k]) {
                    return true;
                }
            }

            switch (c.type) {
                case 'position':
                    obj.positionConstraints.push({
                        weight : c.weight,
                        x      : c.x * graph.width,
                        y      : c.y * graph.height
                    });
                    break;

                case 'linkStrength':
                    obj.linkStrength *= c.strength;
                    break;
            }
        });
    }

    graph.links = [];
    for (var name in graph.data) {
        var obj = graph.data[name];
        for (var depIndex in obj.links) {
	    if (depIndex=="source")
		continue;
            if (obj.links && obj.links.source && obj.id!=obj.links.source)
            {
                alert("The \"source\" network of the links: \""+ obj.links.source + "\" if diferent from the network id: \""+ obj.id +"\". It should be the same.");
            }

            for (var i_array in obj.links[depIndex]) {
                var link = {
                    source : obj,
                    target : findObjById(graph.data, obj.links[depIndex][i_array]),
		    predicate: depIndex
                };
		if (!link.target)
		{
			alert("Cannot find the definion of a network: \""+ obj.links[depIndex][i_array] + "\" linked as \""+depIndex+"\" from the network: \""+ obj.id +"\"");
			continue;
		}
		if (link.source.id==link.target.id)
		{
			alert("Circular reference to the network: \""+ obj.links[depIndex][i_array] + "\" linked as \""+depIndex+"\" from the network: \""+ obj.id +"\"");
			continue;
		}
                //I'm recording the backlinks this has not to be in the model and it is "build" here
                if (!link.target.backLinks_auto)
                    link.target.backLinks_auto = [];
		link.target.backLinks_auto.push({"source": obj.links.source, "predicate": depIndex});

                link.strength = (link.source.linkStrength || 1)
                              * (link.target.linkStrength || 1);
                graph.links.push(link);
            }
        }
    }

    graph.categories = {};
    for (var name in graph.data) {
        var obj = graph.data[name],
            key = obj[config.graph.legendType] + ':' + (obj[config.graph.legendGroup] || ''),
            cat = graph.categories[key];

        obj.categoryKey = key;
        if (!cat) {
            cat = graph.categories[key] = {
                key      : key,
                type     : obj[config.graph.legendType],
                typeName : (config.types[obj[config.graph.legendType]]
                            ? config.types[obj[config.graph.legendType]].short
                            : obj[config.graph.legendType]),
                group    : obj[config.graph.legendGroup],
                count    : 0
            };
        }
        cat.count++;
    }
    graph.categoryKeys = d3.keys(graph.categories);

    graph.colors = colorbrewer.Set3[config.graph.numColors];

    function getColorScale(darkness) {
        return d3.scale.ordinal()
            .domain(graph.categoryKeys)
            .range(graph.colors.map(function(c) {
                return d3.hsl(c).darker(darkness).toString();
            }));
    }

    graph.strokeColor = getColorScale( 0.7);
    graph.fillColor   = getColorScale(-0.1);

    graph.nodeValues = d3.values(graph.data);

    graph.force = d3.layout.force()
        .nodes(graph.nodeValues)
        .links(graph.links)
        .linkStrength(function(d) { return d.strength; })
        .size([graph.width, graph.height])
        .linkDistance(config.graph.linkDistance)
        .charge(config.graph.charge)
        .on('tick', tick);

    graph.svg = d3.select('#graph').append('svg')
        .attr('width' , graph.width  + graph.margin.left + graph.margin.right)
        .attr('height', graph.height + graph.margin.top  + graph.margin.bottom)
      .append('g')
        .attr('transform', 'translate(' + graph.margin.left + ',' + graph.margin.top + ')');

    graph.svg.append('defs').selectAll('marker')
        .data(['end'])
      .enter().append('marker')
        .attr('id'          , String)
        .attr('viewBox'     , '0 -5 10 10')
        .attr('refX'        , 10)
        .attr('refY'        , 0)
        .attr('markerWidth' , 6)
        .attr('markerHeight', 6)
        .attr('orient'      , 'auto')
      .append('path')
        .attr('d', 'M0,-5L10,0L0,5');

    // adapted from http://stackoverflow.com/questions/9630008
    // and http://stackoverflow.com/questions/17883655

    var glow = graph.svg.append('filter')
        .attr('x'     , '-50%')
        .attr('y'     , '-50%')
        .attr('width' , '200%')
        .attr('height', '200%')
        .attr('id'    , 'blue-glow');

    glow.append('feColorMatrix')
        .attr('type'  , 'matrix')
        .attr('values', '0 0 0 0  0 '
                      + '0 0 0 0  0 '
                      + '0 0 0 0  .7 '
                      + '0 0 0 1  0 ');

    glow.append('feGaussianBlur')
        .attr('stdDeviation', 3)
        .attr('result'      , 'coloredBlur');

    glow.append('feMerge').selectAll('feMergeNode')
        .data(['coloredBlur', 'SourceGraphic'])
      .enter().append('feMergeNode')
        .attr('in', String);

    graph.legend = graph.svg.append('g')
        .attr('class', 'legend')
        .attr('x', 0)
        .attr('y', 0)
      .selectAll('.category')
        .data(d3.values(graph.categories))
      .enter().append('g')
        .attr('class', 'category');

    graph.legendConfig = {
        rectWidth   : 12,
        rectHeight  : 12,
        xOffset     : -10,
        yOffset     : 30,
        xOffsetText : 20,
        yOffsetText : 10,
        lineHeight  : 15
    };
    graph.legendConfig.xOffsetText += graph.legendConfig.xOffset;
    graph.legendConfig.yOffsetText += graph.legendConfig.yOffset;

    graph.legend.append('rect')
        .attr('x', graph.legendConfig.xOffset)
        .attr('y', function(d, i) {
            return graph.legendConfig.yOffset + i * graph.legendConfig.lineHeight;
        })
        .attr('height', graph.legendConfig.rectHeight)
        .attr('width' , graph.legendConfig.rectWidth)
        .attr('fill'  , function(d) {
            return graph.fillColor(d.key);
        })
        .attr('stroke', function(d) {
            return graph.strokeColor(d.key);
        });

    graph.legend.append('text')
        .attr('x', graph.legendConfig.xOffsetText)
        .attr('y', function(d, i) {
            return graph.legendConfig.yOffsetText + i * graph.legendConfig.lineHeight;
        })
        .text(function(d) {
            return d.typeName + (d.group ? ': ' + d.group : '');
        });

    $('#graph-container').on('scroll', function() {
        graph.legend.attr('transform', 'translate(0,' + $(this).scrollTop() + ')');
    });

    graph.line = graph.svg.append('g').selectAll('.link')
        .data(graph.force.links())
      .enter().append('line')
        .attr('class', 'link');

    //From https://github.com/Rathachai/d3rdf/blob/master/index.html
     graph.linkTexts = graph.svg.append('g').selectAll('.link-text') 
	                .data(graph.links) 
	                .enter() 
	                .append("text") 
			.attr("class", "link-text") 
			.text( function (d) { return d.predicate }); 

    graph.draggedThreshold = d3.scale.linear()
        .domain([0, 0.1])
        .range([5, 20])
        .clamp(true);

    function dragged(d) {
        var threshold = graph.draggedThreshold(graph.force.alpha()),
            dx        = d.oldX - d.px,
            dy        = d.oldY - d.py;
        if (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
            d.dragged = true;
        }
        return d.dragged;
    }

    graph.drag = d3.behavior.drag()
        .origin(function(d) { return d; })
        .on('dragstart', function(d) {
            d.oldX    = d.x;
            d.oldY    = d.y;
            d.dragged = false;
            d.fixed |= 2;
        })
        .on('drag', function(d) {
            d.px = d3.event.x;
            d.py = d3.event.y;
            if (dragged(d)) {
                if (!graph.force.alpha()) {
                    graph.force.alpha(.025);
                }
            }
        })
        .on('dragend', function(d) {
            if (!dragged(d)) {
                selectObject(d, this);
            }
            d.fixed &= ~6;
        });

    $('#graph-container').on('click', function(e) {
        if (!$(e.target).closest('.node').length) {
            deselectObject();
        }
    });

    graph.node = graph.svg.selectAll('.node')
        .data(graph.force.nodes())
      .enter().append('g')
        .attr('class', 'node')
        .call(graph.drag)
        .on('mouseover', function(d) {
            if (!selected.obj) {
                if (graph.mouseoutTimeout) {
                    clearTimeout(graph.mouseoutTimeout);
                    graph.mouseoutTimeout = null;
                }
                highlightObject(d);
            }
        })
        .on('mouseout', function() {
            if (!selected.obj) {
                if (graph.mouseoutTimeout) {
                    clearTimeout(graph.mouseoutTimeout);
                    graph.mouseoutTimeout = null;
                }
                graph.mouseoutTimeout = setTimeout(function() {
                    highlightObject(null);
                }, 300);
            }
        });

    graph.nodeRect = graph.node.append('rect')
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('stroke', function(d) {
            return graph.strokeColor(d.categoryKey);
        })
        .attr('fill', function(d) {
            return graph.fillColor(d.categoryKey);
        })
        .attr('width' , 120)
        .attr('height', 30);

    graph.node.each(function(d) {
        var node  = d3.select(this),
            rect  = node.select('rect'),
            lines = wrap(d.id),
            ddy   = 1.1,
            dy    = -ddy * lines.length / 2 + .5;

        lines.forEach(function(line) {
            var text = node.append('text')
                .text(line)
                .attr('dy', dy + 'em');
            dy += ddy;
        });
    });

    setTimeout(function() {
        graph.node.each(function(d) {
            var node   = d3.select(this),
                text   = node.selectAll('text'),
                bounds = {},
                first  = true;

            text.each(function() {
                var box = this.getBBox();
                if (first || box.x < bounds.x1) {
                    bounds.x1 = box.x;
                }
                if (first || box.y < bounds.y1) {
                    bounds.y1 = box.y;
                }
                if (first || box.x + box.width > bounds.x2) {
                    bounds.x2 = box.x + box.width;
                }
                if (first || box.y + box.height > bounds.y2) {
                    bounds.y2 = box.y + box.height;
                }
                first = false;
            }).attr('text-anchor', 'middle');

            var padding  = config.graph.labelPadding,
                margin   = config.graph.labelMargin,
                oldWidth = bounds.x2 - bounds.x1;

            bounds.x1 -= oldWidth / 2;
            bounds.x2 -= oldWidth / 2;

            bounds.x1 -= padding.left;
            bounds.y1 -= padding.top;
            bounds.x2 += padding.left + padding.right;
            bounds.y2 += padding.top  + padding.bottom;

            node.select('rect')
                .attr('x', bounds.x1)
                .attr('y', bounds.y1)
                .attr('width' , bounds.x2 - bounds.x1)
                .attr('height', bounds.y2 - bounds.y1);

            d.extent_auto = {
                left   : bounds.x1 - margin.left,
                right  : bounds.x2 + margin.left + margin.right,
                top    : bounds.y1 - margin.top,
                bottom : bounds.y2 + margin.top  + margin.bottom
            };

            d.edge = {
                left   : new geo.LineSegment(bounds.x1, bounds.y1, bounds.x1, bounds.y2),
                right  : new geo.LineSegment(bounds.x2, bounds.y1, bounds.x2, bounds.y2),
                top    : new geo.LineSegment(bounds.x1, bounds.y1, bounds.x2, bounds.y1),
                bottom : new geo.LineSegment(bounds.x1, bounds.y2, bounds.x2, bounds.y2)
            };
        });

        graph.numTicks = 0;
        graph.preventCollisions = false;
        graph.force.start();
        for (var i = 0; i < config.graph.ticksWithoutCollisions; i++) {
            graph.force.tick();
        }
        graph.preventCollisions = true;
        $('#graph-container').css('visibility', 'visible');
    });
}

function findObjById(data, id_value)
{
    for (var name in data) {
        if (data[name].id==id_value)
		return data[name];
    }
    return null;
}

function removeAbbrNamespace(s)
{
    var i=s.indexOf(':');
    if (i!=-1)
        return s.substring(i+1, s.length);
    return s;
}

function getTitleObjById(data, id_value)
{
    var obj=findObjById(data, id_value);
    if (!obj)
        return id_value;
    return obj.title ? obj.title : id_value;
}


var maxLineChars = 26,
    wrapChars    = ' /_-.'.split('');

function wrap(text) {
    if (text.length <= maxLineChars) {
        return [text];
    } else {
        for (var k = 0; k < wrapChars.length; k++) {
            var c = wrapChars[k];
            for (var i = maxLineChars; i >= 0; i--) {
                if (text.charAt(i) === c) {
                    var line = text.substring(0, i + 1);
                    return [line].concat(wrap(text.substring(i + 1)));
                }
            }
        }
        return [text.substring(0, maxLineChars)]
            .concat(wrap(text.substring(maxLineChars)));
    }
}

function preventCollisions() {
    var quadtree = d3.geom.quadtree(graph.nodeValues);

    for (var name in graph.data) {
        var obj = graph.data[name],
            ox1 = obj.x + obj.extent_auto.left,
            ox2 = obj.x + obj.extent_auto.right,
            oy1 = obj.y + obj.extent_auto.top,
            oy2 = obj.y + obj.extent_auto.bottom;

        quadtree.visit(function(quad, x1, y1, x2, y2) {
            if (quad.point && quad.point !== obj) {
                // Check if the rectangles intersect
                var p   = quad.point,
                    px1 = p.x + p.extent_auto.left,
                    px2 = p.x + p.extent_auto.right,
                    py1 = p.y + p.extent_auto.top,
                    py2 = p.y + p.extent_auto.bottom,
                    ix  = (px1 <= ox2 && ox1 <= px2 && py1 <= oy2 && oy1 <= py2);
                if (ix) {
                    var xa1 = ox2 - px1, // shift obj left , p right
                        xa2 = px2 - ox1, // shift obj right, p left
                        ya1 = oy2 - py1, // shift obj up   , p down
                        ya2 = py2 - oy1, // shift obj down , p up
                        adj = Math.min(xa1, xa2, ya1, ya2);

                    if (adj == xa1) {
                        obj.x -= adj / 2;
                        p.x   += adj / 2;
                    } else if (adj == xa2) {
                        obj.x += adj / 2;
                        p.x   -= adj / 2;
                    } else if (adj == ya1) {
                        obj.y -= adj / 2;
                        p.y   += adj / 2;
                    } else if (adj == ya2) {
                        obj.y += adj / 2;
                        p.y   -= adj / 2;
                    }
                }
                return ix;
            }
        });
    }
}

function tick(e) {
    graph.numTicks++;

    for (var name in graph.data) {
        var obj = graph.data[name];

        obj.positionConstraints.forEach(function(c) {
            var w = c.weight * e.alpha;
            if (!isNaN(c.x)) {
                obj.x = (c.x * w + obj.x * (1 - w));
            }
            if (!isNaN(c.y)) {
                obj.y = (c.y * w + obj.y * (1 - w));
            }
        });
    }

    if (graph.preventCollisions) {
        preventCollisions();
    }

    graph.line
        .attr('x1', function(d) {
            return d.source.x;
        })
        .attr('y1', function(d) {
            return d.source.y;
        })
        .each(function(d) {
            if (isIE) {
                // Work around IE bug regarding paths with markers
                // Credit: #6 and http://stackoverflow.com/a/18475039/106302
                this.parentNode.insertBefore(this, this);
            }

            var x    = d.target.x,
                y    = d.target.y,
                line = new geo.LineSegment(d.source.x, d.source.y, x, y);

            for (var e in d.target.edge) {
                var ix = line.intersect(d.target.edge[e].offset(x, y));
                if (ix.in1 && ix.in2) {
                    x = ix.x;
                    y = ix.y;
                    break;
                }
            }

            d3.select(this)
                .attr('x2', x)
                .attr('y2', y);
        });

    graph.node
        .attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
	graph.linkTexts 
		.attr("x", function(d) { return 4 + (d.source.x + d.target.x)/2  ; }) 
		.attr("y", function(d) { return 4 + (d.source.y + d.target.y)/2 ; }); 
}

function writeObjectAsText(name, obj)
{
var s, es_array, es_fill_objecte;

	es_array=((Object.prototype.toString.call( obj ) === '[object Array]' ) ? true: false)
	if (es_array)
		es_fill_objecte=(obj.length>0) ? (typeof obj[0]==="object" ? true : false) : false;

	if (es_array)
	{
		if (!es_fill_objecte)
			s="<em>" +name+ "</em>: " + (obj.length>1 ? "[ ": "");
		else
			s="";
	}
	else
	{	
		s="<em>" +name+ "</em>: <ul> ";
	}

	if (es_array && !es_fill_objecte)
	{
		var previous_item="";
		for (var item in obj) 
		{
			if (previous_item!="") 
			{
				if (typeof obj[previous_item]==="object")
					s+= writeObjectAsText(previous_item, obj[previous_item]) +" | ";
				else
					s+= (es_array ? "" : "<em>" +previous_item+ "</em>: ")+ obj[previous_item] +" | ";
	        	}
	        	previous_item=item;
		}
		if (previous_item!="")
		{
			if (typeof obj[previous_item]==="object")
				s+=writeObjectAsText(previous_item, obj[previous_item]);
			else
				s+=(es_array ? "" : "<em>" +previous_item+ "</em>: ")+ obj[previous_item];
		}
		s+=(obj.length>1 ? " ]": "");
	}
	else
	{
		for (var item in obj) 
		{
			if (typeof obj[item]==="object")
				s+= writeObjectAsText((es_array ? name+ (obj.length>1 ? "["+item+"]" : "") : item), obj[item]);
			else
     			       	s+= (es_array ? "" : "<li><em>" +item+ "</em>: ")+ obj[item];
		}
		s+=" </ul>";
	}
	return s;
}

function makeDocumentationAboutObj(obj)
{
var i;
var s="";


    if (obj.logo)
    {
        s+="<table><tr><td valign=\"top\">";
        if (obj.url)
            s+="<a href=\"" + obj.url + "\" target=\"_blank\">";
        s+="<img src=\""+obj.logo+"\" border=\"0\" width=\"50\">";
        if (obj.url)
            s+="</a>";
        s+="</td><td>";
    }
    s+="<h2>";
    if (obj.url)
        s+="<a href=\"" + obj.url + "\" target=\"_blank\">";
    s+=(obj.title ? obj.title : obj.id);
    if (obj.url)
        s+="</a>";
    if (obj.title)
        s+=" <em><a href=\"#obj-" +obj.id+ "\" class=\"select-object\" data-name=\"" + obj.id + "\">"+obj.id+"</a></em>";
    s+="</h2>\n\n";

    if (obj.description)
    	s+="<p>"+obj.description+"</p>";
    else
        s+="<div class=\"alert alert-warning\">No documentation for this object<\/div>";

    if (obj.logo)
        s+="</td></tr></table>"

    //s+="\n<a href=\"https://geoviqua.stcorp.nl/submit_feedback.html?target_code="+ obj.id +"&target_codespace=http://www.eneon.net&natureOfTarget=dataset\" target=\"_blank\">Add user feedback</a> or <a href=\"http://geoviqua.stcorp.nl/api/v1/feedback/items/search?target_code="+ obj.id+ "&target_codespace=http://www.eneon.net&format=text&view=full\" target=\"_blank\">View previous feedback</a> about this item<p>\n\n";
    s+="\n<a href=\"javascript:void();\" onClick='GUFShowFeedbackInHTMLDiv(document.getElementById(\"div_guf_"+ obj.id +"\"), \"div_guf_rsc"+ obj.id +"\", \"node\", \""+ obj.id +"\", \""+ obj.id +"\", \"http://www.eneon.net\", \"eng\")'>Add user feedback or review previous feedback</a> about this item<p>\n\n";
    s+="\n<div id=\"div_guf_"+ obj.id +"\" style=\"width: 90%\"></div>";
    s+="\n\n<h3>Properties</h3>\n\n<ul>\n";
    i=0;
    for (var name in obj) {
        if (name=="id" || name=="title" || name=="description" || name=="url" || name=="logo" || name=="links" ||
            name=="positionConstraints" || name=="linkStrength" || name=="backLinks_auto" || name=="categoryKey" || 
	    name=="extent_auto" || name=="edge" || name=="index" || name=="weight" || name=="x" || name=="y" || 
	    name=="px" || name=="py" || name=="oldX" || name=="oldY" || name=="dragged" || name=="fixed")
            continue;
	if (obj[name]==null)
	    continue;	
        s+="<li>";
        if (typeof obj[name]==="object")
            s+=writeObjectAsText(name, obj[name]);
	else
	    s+="<em>" +name+ "</em>: "+ obj[name];
        s+="</li>\n";
        i++;
    }
    if (i==0)
        s+="<em>(none)</em>\n";
    s+="</ul>\n";

    s+="</ul>\n\n<h3>Links to</h3>\n\n<ul>\n";
    i=0;
    for (var depIndex in obj.links) {
        if (depIndex=="source")
	    continue;
        for (var i_array in obj.links[depIndex]) {
	    s+="<li><em>" +depIndex+ "</em>: <a href=\"#obj-" +obj.links[depIndex][i_array]+ "\" class=\"select-object\" data-name=\"" + obj.links[depIndex][i_array] + "\">" +
		getTitleObjById(graph.data, obj.links[depIndex][i_array]) + " </a><em>(" +obj.links[depIndex][i_array]+ ")</em></li>\n";
            i++;
        }
    }
    if (i==0)
        s+="<em>(none)</em>\n";
    s+="</ul>\n";

    s+="\n\n<h3>Backlinks to<\/h3>\n\n<ul>\n";
    for (var name in obj.backLinks_auto) {
	s+="<li><em>" +obj.backLinks_auto[name].predicate+ " of</em>: <a href=\"#obj-" +obj.backLinks_auto[name].source+ "\" class=\"select-object\" data-name=\"" + obj.backLinks_auto[name].source + "\">" + 
		getTitleObjById(graph.data, obj.backLinks_auto[name].source) + " </a><em>(" +obj.backLinks_auto[name].source+ ")</em></li>\n";
    }
    if (!obj.backLinks_auto)
	s+="<em>(none)</em>\n";
    s+="</ul>\n";
    return s;
}

function selectObject(obj, el) {
var node;

    if (el) {
        node = d3.select(el);
    } else {
        graph.node.each(function(d) {
            if (d === obj) {
                node = d3.select(el = this);
            }
        });
    }
    if (!node) return;

    if (node.classed('selected')) {
        deselectObject();
        return;
    }
    deselectObject(false);

    selected = {
        obj : obj,
        el  : el
    };

    highlightObject(obj);

    node.classed('selected', true);

    s=makeDocumentationAboutObj(obj);
    s+="<small>To add user feedback please use <b>geoviqua_user</b> and <b>pub@geoviqua</b></small>"

    $('#docs').html(s);
    $('#docs-container').scrollTop(0);
    resize(true);

    var $graph   = $('#graph-container'),
        nodeRect = {
            left   : obj.x + obj.extent_auto.left + graph.margin.left,
            top    : obj.y + obj.extent_auto.top  + graph.margin.top,
            width  : obj.extent_auto.right  - obj.extent_auto.left,
            height : obj.extent_auto.bottom - obj.extent_auto.top
        },
        graphRect = {
            left   : $graph.scrollLeft(),
            top    : $graph.scrollTop(),
            width  : $graph.width(),
            height : $graph.height()
        };
    if (nodeRect.left < graphRect.left ||
        nodeRect.top  < graphRect.top  ||
        nodeRect.left + nodeRect.width  > graphRect.left + graphRect.width ||
        nodeRect.top  + nodeRect.height > graphRect.top  + graphRect.height) {

        $graph.animate({
            scrollLeft : nodeRect.left + nodeRect.width  / 2 - graphRect.width  / 2,
            scrollTop  : nodeRect.top  + nodeRect.height / 2 - graphRect.height / 2
        }, 500);
    }
}

var listOpen="";
function showList(data, option) {
var s="";

    if (listOpen!="" && option==listOpen) {
        deselectObject();
        return;
    }
    deselectObject(false);

    if (option=='list')
    {
        for (var name in data) {
	    var obj=data[name];
            s+="<div class=\"docs\" id=\"obj-"+obj.id+"\">" + makeDocumentationAboutObj(obj) + "</div>"; 
        }
	s+="<small>To add user feedback please use <b>geoviqua_user</b> and <b>pub@geoviqua</b></small>"
	$('#docs').html(s);
    }
    else if (option=='table')
    {
	var i=0;
        s+="<table><tr><th>#</th><th>Theme</th><th>SBA</th><th>Type</th><th>Extent</th><th>Name</th><th>URL</th><th>email</th><th>#links</th><th>#backlk</th></tr>";
        for (var name in data) {
	    var obj=data[name];
            i++;	
            s+="<tr><td align=\"right\" valign=\"top\">"+i;
	    s+="</td><td valign=\"top\">";
            if (obj.theme) s+=obj.theme;
            s+="</td><td valign=\"top\">";
            if (obj.SBA) s+=obj.SBA;
            s+="</td><td valign=\"top\">";
            if (obj.type) s+=obj.type;
            s+="</td><td valign=\"top\">";
            if (obj.extent) s+=obj.extent;
            s+="</td><td valign=\"top\">";
            s+="<a href=\"#obj-" +obj.id+ "\" class=\"select-object\" data-name=\"" + obj.id + "\">"+(obj.title ? obj.title : obj.id)+"</a>";
            if (obj.title)
        	s+=" <em>(" + obj.id + ")</em>";
            s+="</td><td valign=\"top\">";
            if (obj.url)
	            s+="<a href=\"" + obj.url + "\" target=\"_blank\">"+obj.url+"</a>";
            s+="</td><td valign=\"top\">";
            if (obj.contact)
	            s+="<a href=\"mailto:" + obj.contact + "\">"+obj.contact+"</a>";
            s+="</td><td align=\"right\" valign=\"top\">";
            if (obj.links)
	    {
		var n=0;
	        for (var link in obj.links) {
	            if (link!="source" && obj.links[link].length)
			n+=obj.links[link].length;
		}
		s+=n;
            }
            s+="</td><td align=\"right\" valign=\"top\">";
	    if (obj.backLinks_auto)
		s+=obj.backLinks_auto.length;
            s+="</td></tr>";
	}
	s+="</table>"
	$('#docs').html(s);
    }
    else
    {
        s+="<div class=\"docs\" id=\"obj-----\">"+
	"<form name=\"text_form\"><table><tr><td valign=\"top\">JSON-LD: (<a href=\"" +config.jsonUrl+ "\" target=\"_blank\">Download the JSON file</a>)<br><textarea readonly class=\"text-area-no-wrap\" rows=\"15\" cols=\"60\">"+graph.full_json_text+"</textarea></td><td valign=\"top\">RDF:<br/><textarea readonly class=\"text-area-no-wrap\" rows=\"15\" cols=\"130\" name=\"rdf_textarea\"></textarea></td></tr></table></form></div>"; 
        $('#docs').html(s);
        jsonld.toRDF(JSON.parse(graph.full_json_text), {base: document.baseURI || document.URL, format: 'application/nquads'}, function(err, nquads) {
	     document.text_form.rdf_textarea.value=nquads;
        });
    }


    if (listOpen=="")
    {
        $('#docs-container').scrollTop(0);
        resize(true);

        var $graph   = $('#graph-container'),
            graphRect = {
                left   : $graph.scrollLeft(),
                top    : $graph.scrollTop(),
                width  : $graph.width(),
                height : $graph.height()
            };

        $graph.animate({
            scrollLeft : graphRect.width  / 2,
            scrollTop  : graphRect.height / 2
            }, 500);
    }
    listOpen=option;
}

function showSourceCode()
{
}

function deselectObject(doResize) {
    if (doResize || typeof doResize == 'undefined') {
        resize(false);
    }
    listOpen="";
    graph.node.classed('selected', false);
    selected = {};
    highlightObject(null);
}

function isTheIdPresentInObjBackLinks(obj, id_value) {
    for (var depIndex in obj.backLinks_auto) {
        if (obj.backLinks_auto[depIndex].source==id_value)
            return true;
    }
    return false;
}


function isTheIdPresentInObjLinks(obj, id_value) {
    for (var depIndex in obj.links) {
        if (depIndex=="source")
            continue;
        for (var i_array in obj.links[depIndex]) {
	    if (obj.links[depIndex][i_array]==id_value)
		return true;
        }
    }
    return false;
}

function highlightObject(obj) {
    if (obj) {
        if (obj !== highlighted) {
            graph.node.classed('inactive', function(d) {
                return (obj !== d
                     && (!d.backLinks_auto || isTheIdPresentInObjBackLinks(d, obj.id) == false)
                     && isTheIdPresentInObjLinks(d, obj.id) == false);
            });
            graph.line.classed('inactive', function(d) {
                return (obj !== d.source && obj !== d.target);
            });
	    graph.linkTexts.classed('inactive', function(d) {
                return (obj !== d.source && obj !== d.target);
            });
        }
        highlighted = obj;
    } else {
        if (highlighted) {
            graph.node.classed('inactive', false);
            graph.line.classed('inactive', false);
            graph.linkTexts.classed('inactive', false);
        }
        highlighted = null;
    }
}

var showingDocs       = false,
    docsClosePadding  = 8,
    desiredDocsHeight = 300;

function resize(showDocs) {
    var docsHeight  = 0,
        graphHeight = 0,
        $docs       = $('#docs-container'),
        $graph      = $('#graph-container'),
        $close      = $('#docs-close');

    if (typeof showDocs == 'boolean') {
        showingDocs = showDocs;
        $docs[showDocs ? 'show' : 'hide']();
    }

    if (showingDocs) {
        docsHeight = desiredDocsHeight;
        $docs.css('height', docsHeight + 'px');
    }

    graphHeight = window.innerHeight - docsHeight;
    $graph.css('height', graphHeight + 'px');

    $close.css({
        top   : graphHeight + docsClosePadding + 'px',
        right : window.innerWidth - $docs[0].clientWidth + docsClosePadding + 'px'
    });
}
