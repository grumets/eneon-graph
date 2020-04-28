"use strict"

var GraphsMM=[]


function arrayBufferToString(buffer){
    var arr = new Uint8Array(buffer);
    var str = String.fromCharCode.apply(String, arr);
    return str;
}


//Preparo una funció per descarregar les dades JSON assincronament
//Extreta de: http://stackoverflow.com/questions/9838812/how-can-i-open-a-json-file-in-javascript-without-jquery
function loadJSON(path, success, error, extra_param)
{
var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function()
	{
        if (xhr.readyState === XMLHttpRequest.DONE) 
		{
	       	if (xhr.status === 200) 
			{
            	if (success)
				{
					var data;
					try {
						data = JSON.parse(xhr.responseText);
					} 
					catch (e) {
		                		if (error)
							return error("JSON file: \""+ path + "\". " + e);
					}
					success(data, extra_param);
				}
			} 
			else 
			{
                if (error)
				{
					var s=null;
					if (xhr.response)
					{
						var s=arrayBufferToString(xhr.response);
						if (-1!=s.indexOf("<body>"))
							s=s.substring(s.indexOf("<body>"));
					}
		    			error("JSON file: \""+ path + "\". Status: " + xhr.statusText + "\n\nURL: "+ path + ((xhr.getAllResponseHeaders && xhr.getAllResponseHeaders()) ? "\n\nResponse headers:\n"+xhr.getAllResponseHeaders() : "") + ((s) ? "\nResponse Body:\n"+s : ""), extra_param);
				}
			}
		}
	};
	xhr.open("GET", path, true);
	//xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=ISO-8859-1');
	xhr.setRequestHeader('Accept', 'application/json');
	//xhr.setRequestHeader('Accept-Charset', 'utf-8');	Això no li agrada als navegadors, donen error
	xhr.send();
}

/*
 * Binary search (bsearch) in a sorted array (from https://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search   http://jsfiddle.net/aryzhov/pkfst550/
 * Returns 
      * the index of the element in a sorted array that is iqual to 'elem' (see the note if there are more than one)
      * (-n-1) where n is the insertion point for the new element.  E.g. -5 means "insert in i=4" to keep the array sorted, a.k.a "insert between 3 and 4".
 * Parameters:
 *     list - The array
 *     elem - An element to search for
 *     compare_fn - A comparator function in the same way that Array.sort() wants it: The function takes two arguments: (elem, b) and returns:
 *        a negative number  if a is less than b;
 *        0 if a is equal to b;
 *        a positive number of a is greater than b.
 * Note: The array may contain duplicate elements. 
 * If there are more than one equal elements in the array, the returned value can be the index of any one of the equal elements.
 */
function binarySearch(list, elem, compare_fn)
{
	var m = 0;
	var n = list.length - 1;
	while (m <= n) {
        	var k = (n + m) >> 1;
	        var cmp = compare_fn(elem, list[k]);
	        if (cmp > 0) {
			m = k + 1;
	        } else if(cmp < 0) {
			n = k - 1;
		} else {
			return k;
		}
	}
	return -m - 1;
}


function removeAbbrNamespace(s)
{
    var i=s.indexOf(':');
    if (i!=-1)
        return s.substring(i+1, s.length);
    return s;
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

function showDocumentationAboutNodNetworkGlobal(i_graph, id_nod)
{
var graph=GraphsMM[i_graph];
	document.getElementById(graph.div.info).innerHTML=makeDocumentationAboutNodNetwork(graph, graph.d.network[INodFromNetworkId(graph.d, id_nod)]);
	graph.vis_network.selectNodes([id_nod], true);
}

function makeDocumentationAboutNodNetwork(graph, obj)
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
	for (var name in obj) 
	{
		if (name=="id" || name=="title" || name=="description" || name=="url" || name=="logo" || name=="links" ||
			name=="positionConstraints" || name=="linkStrength" || name=="backlinks" || name=="categoryKey" || 
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
	for (var propName in obj.links) 
	{
		if (propName=="source")
			continue;
		var links=obj.links[propName];
		for (var i_link in links) 
		{
			var nod=graph.d.network[INodFromNetworkId(graph.d, links[i_link])];
			var title=(nod.title ? nod.title : nod.id);
			s+="<li><em>" +propName+ "</em>: <a href=\"javascript:void(0);\" onClick=\'showDocumentationAboutNodNetworkGlobal("+graph.i_graph+", \"" + links[i_link] + "\")\'>" +
				title + "</a> ";
			if (title!=links[i_link])
				s+="<em>(" +links[i_link]+ ")</em>";
			s+="</li>\n";
			i++;
		}
	}
	if (i==0)
        	s+="<em>(none)</em>\n";
	s+="</ul>\n";

	s+="\n\n<h3>Backlinks to<\/h3>\n\n<ul>\n";
	i=0;
	for (var propName in obj.backlinks) 
	{
		if (propName=="source")
			continue;
		var backlinks=obj.backlinks[propName];
		for (var i_link in backlinks) 
		{
			var nod=graph.d.network[INodFromNetworkId(graph.d, backlinks[i_link])];
			title=(nod.title ? nod.title : nod.id);
			s+="<li><em>" +propName+ " of</em>: <a href=\"javascript:void(0);\" onClick=\'showDocumentationAboutNodNetworkGlobal("+graph.i_graph+", \"" + backlinks[i_link] + "\")\'>" +
				title + "</a> ";
			if (title!=backlinks[i_link])
				s+="<em>(" +backlinks[i_link]+ ")</em>";
			s+="</li>\n";
			i++;
		}
	}
	/*
	for (var name in obj.backLinks) 
	{
		s+="<li><em>" +name+ " of</em>: <a href=\"#obj-" +obj.backLinks[name].source+ "\" class=\"select-object\" data-name=\"" + obj.backLinks_auto[name].source + "\">" + 
			getTitleObjById(graph.data, obj.backLinks_auto[name].source) + " </a><em>(" +obj.backLinks_auto[name].source+ ")</em></li>\n";
	}*/
	if (i==0)
		s+="<em>(none)</em>\n";
	s+="</ul>\n";
	return s;
}



function IsNodeTypeOfNetwork(nod, qnode)
{
	if (nod.supertype && qnode.supertype)
	{
		for (var i=0; i<qnode.supertype.length; i++)
			if (nod.supertype==qnode.supertype[i])
				return true;
	}
	if (nod.type && qnode.type)
	{
		for (var i=0; i<qnode.type.length; i++)
			if (nod.type==qnode.type[i])
				return true;
	}
	if (nod.subtype && qnode.subtype)
	{
		for (var i=0; i<qnode.subtype.length; i++)
			if (nod.subtype==qnode.subtype[i])
				return true;
	}
	return false;
}

function INodFromNetworkId(d, id)
{
	var i=binarySearch(d.sortedNodId, id, findSortedNodId);
	if (i<0 || i>d.sortedNodId.length)
		return -1;
	return d.sortedNodId[i].i;
}

function IsAlreadyInTheArray(list, elem)
{
	for (var i=0; i<list.length; i++)
	{
		if (list[i]==elem)
			return true;
	}
	return false
}


function LoopIntoLinksOfNetwork(d, nod, filter, path)
{
	for (var propName in nod.links) 
	{
		if (propName=="source")
			continue;		
		var links=nod.links[propName];
		for (var i_link=0; i_link<links.length; i_link++)
		{
			var i=INodFromNetworkId(d, links[i_link])
			if (i<0)
			{
				alert("The linked resource " + links[i_link] + " in links." + propName + " of the node network " + nod.id +" cannot be found as a node network id in the network.");
				return;
			}
			var new_nod=d.network[i];
			
			//Prevent an infinite loop
			if (IsAlreadyInTheArray(path[path.length-1], i))
				continue;

			//Si arribo al final plego i dic que l'he trobat
			if (IsNodeTypeOfNetwork(new_nod, filter.end_node))
			{
				path.push(path[path.length-1].slice(0)); //Si ha trobat el final duplico el path i el guardo.
				path[path.length-2].push(i);
				continue;
			}
			
			//Si és un node prohibit el salto
			if (IsNodeTypeOfNetwork(new_nod, filter.excluded_intermediate_node))
				continue;
			//si arribo a in node ini el salto
			if (IsNodeTypeOfNetwork(new_nod, filter.ini_node))
				continue;
			
			path[path.length-1].push(i);
			LoopIntoLinksOfNetwork(d, new_nod, filter, path)
			path[path.length-1].pop();
		}
	}
	return false;
}

function ApplyFilterNetwork(d, filter, selected_nodes, param)
{
var network=d.network;

	//començo per un node.
	for (var i=0; i<network.length; i++)
	{
		var nod=network[i];
		//miro si el node és un extrem
		if (IsNodeTypeOfNetwork(nod, filter.ini_node))
		{
			if (param && param.ini_node_name && param.ini_node_name!=nod.id)
				continue;
			var path=[[i]];
			LoopIntoLinksOfNetwork(d, nod, filter, path);
			path.pop();
			if (path.length==0 && param.flags && param.flags.connect===false)
			{
				selected_nodes[i]=true;
			}
			else
			{
				for (var j=0; j<path.length; j++)
				{
					if (param && param.flags)
					{
						if (param.flags.ini_node)
							selected_nodes[path[j][0]]=true;
						continue;
					}
					if (filter.type=="extreme")
					{
						selected_nodes[path[j][0]]=true;
						selected_nodes[path[j][path[j].length-1]]=true;
					}	
					else
					{
						for (var p=0; p<path[j].length; p++)
							selected_nodes[path[j][p]]=true;
					}
				}
			}
		}
	}
}


function sortSortedNodId(a, b)
{
	return ((a.id < b.id) ? -1 : ((a.id > b.id) ? 1 : 0));
}

function findSortedNodId(id, b)
{
	return ((id < b.id) ? -1 : ((id > b.id) ? 1 : 0));
}

function sortSortedType(a, b)
{
	return ((a.type < b.type) ? -1 : ((a.type > b.type) ? 1 : 0));
}

function findSortedType(type, b)
{
	return ((type < b.type) ? -1 : ((type > b.type) ? 1 : 0));
}

function AddQSearchInfoNetwork(d)
{
	d.sortedNodId=[];
	for (var i=0; i<d.network.length; i++)
	{
		d.sortedNodId[i]={id: d.network[i].id, i: i};
	}	
	d.sortedNodId.sort(sortSortedNodId);
}

/*Aquesta funció afegeix la propietat backlinks a cada network[i] amb la mateixa
estructura que links (però sense source).*/
function AddBackLinksToNetwork(d)
{
	for (var i=0; i<d.network.length; i++)
	{
		var nod=d.network[i];
		for (var propName in nod.links) 
		{
			if (propName=="source")
				continue;		
			var links=nod.links[propName];
			for (var i_link=0; i_link<links.length; i_link++)
			{				
				var j=INodFromNetworkId(d, links[i_link]);
				if (j<0)
				{
					alert("The linked resource " + links[i_link] + " in links." + propName + " of the node network " + nod.id +" cannot be found as a node network id in the network.");
					return;
				}
				var nod2=d.network[j];
			        if (!nod2.backlinks)
					nod2.backlinks={}
				if (!nod2.backlinks[propName])
					nod2.backlinks[propName]=[];
				nod2.backlinks[propName].push(nod.id);
			}
		}
	}	
}

function TransformNetworkInVisData(nodes, edges, d, styles, selected_nodes, select_true)
{
var network=d.network;

	styles.node.sort(sortSortedType);
	for (var i=0; i<network.length; i++)
	{
		if (selected_nodes &&
			((select_true && !selected_nodes[i]) ||
			 (!select_true && selected_nodes[i]))   )
			continue;

		var nod=network[i];
		var i_style=binarySearch(styles.node, nod.type, findSortedType);
		if (i_style<0 || i_style>d.sortedNodId.length)
			nodes.push({id: nod.id, label: removeAbbrNamespace(nod.id), title: nod.title, color: {background:'LightYellow', border:'GoldenRod'}, borderWidth: 3});
		else
		{
			var style=styles.node[i_style];
			nodes.push({id: nod.id, label: removeAbbrNamespace(nod.id), title: nod.title, shape: (style.shape ? style.shape : 'box'), color: (style.color ? style.color : {background:'LightYellow', border:'GoldenRod'}), borderWidth: (style.borderWidth ? style.borderWidth : 1)});
		}
		for (var propName in nod.links) 
		{
			if (propName=="source")
				continue;		
			var links=nod.links[propName];
			for (var i_link=0; i_link<links.length; i_link++)
			{				
				var j=INodFromNetworkId(d, links[i_link]);
				if (selected_nodes &&
					((select_true && !selected_nodes[j]) ||
					 (!select_true && selected_nodes[j]))   )
					continue;
			        edges.push({from: nod.id, to: links[i_link], arrows:'to', label: propName});
			}
		}
	}
}

function SelectedNodesToNodeIds(nodes_id, d, selected_nodes, select_true)
{
var network=d.network;

	for (var i=0; i<network.length; i++)
	{
		if (selected_nodes &&
			((select_true && !selected_nodes[i]) ||
			 (!select_true && selected_nodes[i]))   )
			continue;

		nodes_id.push(network[i].id);
	}
}

function PresentStatusMessage(div, s)
{
	document.getElementById(div).innerHTML=s;
}

function AddRemainingSelectorOptionsFilter(graph, select_filter_id, i_filter)
{
var filter=graph.filter[i_filter];

	PresentStatusMessage(graph.div.status, "Running filter \""+filter.description+"\" ("+(i_filter+1)+"/"+graph.filter.length+")...");
	setTimeout(AddingRemainingSelectorOptionsFilter, 100, graph, "select_filter_"+graph.i_graph, i_filter);
}

function AddingRemainingSelectorOptionsFilter(graph, select_filter_id, i_filter)
{
var filter=graph.filter[i_filter];
var sel=document.getElementById(select_filter_id), cdns=[];
var opt=document.createElement("option");

	opt.text = filter.description;
	opt.value = "_all_filter_"+i_filter+"_";
	sel.options.add(opt);

	//començo per un node.
	var selected_nodes=[];
			
	ApplyFilterNetwork(graph.d, filter, selected_nodes, {flags: {ini_node: true}});

	cdns.push("<h2>", filter.description, "</h2><ul>");

	var network=graph.d.network;
	for (var i=0; i<network.length; i++)
	{
		var nod=network[i];
		//miro si el node és un extrem
		if (IsNodeTypeOfNetwork(nod, filter.ini_node) && 
			((filter.connect && selected_nodes[i]) || (!filter.connect && !selected_nodes[i])))
		{
			if (filter.connect)
			{
				var opt = document.createElement("option");
				opt.text = " - only for "+removeAbbrNamespace(nod.id);
				opt.value = "filter_"+i_filter+"_"+nod.id;
				sel.options.add(opt);
			}
			cdns.push("<li>", nod.title, " (", removeAbbrNamespace(nod.id), ")");
		}
	}
	cdns.push("</ul>");
	document.getElementById(graph.div.info).innerHTML += cdns.join("");

	i_filter=i_filter+1;
	if (i_filter<graph.filter.length)
		AddRemainingSelectorOptionsFilter(graph, select_filter_id, i_filter)
	else
		PresentStatusMessage(graph.div.status, "Completed. Please select.");
}

function PresentSelectors(graph)
{
var div=document.getElementById(graph.div.selectors), cdns=[];

	if (div)
	{
		cdns.push("Draw: <select id=\"select_filter_",graph.i_graph,"\" onChange=\"RedrawFilteredGraph(",graph.i_graph,", this.value);\">",
				"<option value=\"_select_\">--Please select--</option>",
				"<option value=\"_full_graph_\">Full graph</option>",
			  "</select>");
		div.innerHTML=cdns.join("");

		//Ara presento tots els indicadors
		document.getElementById(graph.div.info).innerHTML=""

		if (graph.filter && graph.filter.length)
			AddRemainingSelectorOptionsFilter(graph, "select_filter_"+graph.i_graph, 0);
	}
}

function PrepareForDrawingGraph(graph)
{
	PresentStatusMessage(graph.div.status, "Drawing, please wait...");
	graph.vis_network.once("afterDrawing", function() {
		PresentStatusMessage(graph.div.status, "Drawing completed. Zooming...");
		graph.vis_network.moveTo({
        		position: {x:0,y:0},
        		scale: 1,
		        offset: {x:0,y:0},
        		animation: true   // default duration is 1000ms and default easingFunction is easeInOutQuad.
	      	});
    	});
	graph.vis_network.once("animationFinished", function() {
		PresentStatusMessage(graph.div.status, "Completed");
	});
}

function RedrawFilteredGraph(i_graph, filter_name)
{
var nodes=[], edges=[], selected_nodes=[], nodes_id=[], graph=GraphsMM[i_graph];

	if (filter_name=="_select_")
		return;
	if (filter_name=="_full_graph_")
		TransformNetworkInVisData(nodes, edges, graph.d, graph.styles, null, true);
	else
	{
		for (var i_filter=0; i_filter<graph.filter.length; i_filter++)
		{
			var filter=graph.filter[i_filter];
			if (filter_name=="_all_filter_"+i_filter+"_")
			{
				ApplyFilterNetwork(graph.d, filter, selected_nodes, (filter.connect===false) ? {flags:{connect: false}} : null);
				TransformNetworkInVisData(nodes, edges, graph.d, graph.styles, selected_nodes, true);
			}
			else
			{
				var s="filter_"+i_filter+"_";
				if (filter_name.substring(0, s.length)==s)
				{
					ApplyFilterNetwork(graph.d, filter, selected_nodes, {ini_node_name: filter_name.substring(s.length)});
					TransformNetworkInVisData(nodes, edges, graph.d, graph.styles, selected_nodes, true);
				}
			}
		}
	}
	//graph.vis_network.selectNodes(nodes_id, true);
	//graph.vis_options.layout.randomSeed=graph.vis_network.getSeed();
	//graph.vis_network.setOptions(graph.vis_options);
	PrepareForDrawingGraph(graph);
	graph.vis_network.setData({nodes:nodes, edges:edges});
	//graph.vis_network.redraw();
}

function StartDrawingGraph(d, param)
{
    // initialize your network!
var selected_nodes=[], graph=GraphsMM[param.i_graph];

	graph.i_graph=param.i_graph;
	graph.d=d;
	
	AddQSearchInfoNetwork(graph.d);
	AddBackLinksToNetwork(graph.d);

	PresentSelectors(graph);

	graph.vis_network = new vis.Network(document.getElementById(graph.div.graph), 
			{nodes: new vis.DataSet([]), edges: new vis.DataSet([]) }, 
			graph.vis_options);
	graph.vis_network.on("click", function (params) {
	        document.getElementById(graph.div.info).innerHTML = ""
		for (var i_nod=0; i_nod<params.nodes.length; i_nod++)
			document.getElementById(graph.div.info).innerHTML += makeDocumentationAboutNodNetwork(graph, graph.d.network[INodFromNetworkId(graph.d, params.nodes[i_nod])]);
    	});
}

function IniciaGraph(div, graph_json)
{
	var i_graph=GraphsMM.push({
		graph_json: graph_json,
		div: div, 
		filter: [{
			//Connecta un SDG indicator amb una EONetwork sense passar per un SDG
			description: "All SDG indicators connected to EO networks",
			type: "connected",  //De moment pot valer "connected" o "extreme"
			connect: true,
			ini_node: {supertype: ["SDGIndicator"], type: null, subtype: null},
			excluded_intermediate_node: {supertype: null, type: ["SDG"], subtype: null},
			end_node: {supertype: null, type: ["EONetwork"], subtype: null},
		},
		{
			//Connecta un EV amb una EONetwork sense passar per un SDG_indicator
			description: "All EVs NOT connected to EO networks",
			type: "connected",  //De moment pot valer "connected" o "extreme"
			connect: false,
			ini_node: {supertype: ["EV"], type: null, subtype: null},
			excluded_intermediate_node: {supertype: ["SDGIndicator"], type: null, subtype: null},
			end_node: {supertype: null, type: ["EONetwork"], subtype: null},
		},
		{
			//Connecta un SDG indicator amb una EV sense passar per un SDG
			description: "All SDG indicators connected to EV",
			type: "connected",  //De moment pot valer "connected" o "extreme"
			connect: true,
			ini_node: {supertype: ["SDGIndicator"], type: null, subtype: null},
			excluded_intermediate_node: {supertype: null, type: ["SDG"], subtype: null},
			end_node: {supertype: ["EV"], type: null, subtype: null},
		},
		{
			//Connecta un SDG indicator amb una EV sense passar per un SDG
			description: "All SDG indicators NOT connected to EV",
			type: "connected",  //De moment pot valer "connected" o "extreme"
			connect: false,
			ini_node: {supertype: ["SDGIndicator"], type: null, subtype: null},
			excluded_intermediate_node: {supertype: null, type: ["SDG"], subtype: null},
			end_node: {supertype: ["EV"], type: null, subtype: null},
		}],
		vis_options: { 
			interaction: { navigationButtons: true, keyboard: true},
			layout: {randomSeed: undefined, improvedLayout:false},
			nodes: {shape: 'box', borderWidth: 2, shadow:true},
			edges: {font: {align: 'top', size: 10}}
		},
		styles: {
			//Useful table of colors: https://www.w3schools.com/colors/colors_names.asp
			node: [{
				type: "EONetwork",
				shape: 'ellipse',
				color: {background:'Aquamarine', border:'Blue'}
			},{
				type: "SDG",
				color: {background:'LightYellow', border:'GoldenRod'}
			},{
				type: "SDGIndicator_S",
				color: {background:'MediumSlateBlue', border:'Indigo'}
			},{
				type: "SDGIndicator_I",
				color: {background:'OrangeRed', border:'Red'}
			},{
				type: "SDGIndicator_R",
				color: {background:'RoyalBlue', border:'Blue'}
			},{
				type: "SDGIndicator_P",
				color: {background:'SandyBrown', border:'Brown'}
			},{
				type: "EBV",
				color: {background:'YellowGreen', border:'SeaGreen'}
			},{
				type: "ECV",
				color: {background:'Pink', border:'Orchid'}
			},{
				type: "EOV",
				color: {background:'Silver', border:'DarkGray'}
			},{
				type: "SocioEcoV",
				color: {background:'Orchid', border:'MediumVioletRed'}
			},{
				type: "EAV",
				color: {background:'LightBlue', border:'LightSteelBlue'}
			},{
				type: "EREV",
				color: {background:'Moccasin', border:'Khaki'}
			}],
			eage: []  //no programat encara
		}
	});
	loadJSON(graph_json,
			StartDrawingGraph,
			function(xhr) { alert(xhr); },
			{i_graph: i_graph-1});
}
