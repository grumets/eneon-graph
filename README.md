# ENEON-graph
This site explains how to apply the graph used in www.eneon.net for visualizing a graph in the browser read  directly from a json file. There are two possible graphs: the first one (graph-EV-SDG) doesn't include queries to the json file, while the second option (graph-vis), does.
## Graph without queries
The files for deploying this graph are included in the graph-EV-SDG folder.

You need to copy this folder locally, paying attention at the following files:
* networks.json. Is where all the data is stored following json format. In this particular case, Research Infrastructures, Essential Variables and SDG indicators, are described and interrelated. For example:
```
{
		"id":  "eneon:Phenology",
		"type": "EBV",
		"supertype": "EV",		
		"theme": ["Biosphere", "Ecosystems", "Environment"],
		"SBA": ["Biodiversity and Ecosystem Sustainability"],
		"EV_class": "Species traits",			
		"title": "Phenology",
		"url": "https://geobon.org/ebvs/what-are-ebvs/",
		"measurementAndScalability": "Presence, absence, abundance or duration of seasonal activities of organisms. Examples: Timing of breeding, flowering, fruiting, emergence, host infection.",
		"temporalSensitivity": "1 year",
		"feasibility": "Several initiatives to collect plant phenology data at continental scales (e.g. USA, Europe), some making use of citizen science, integration in Global Plant Phenology Data Portal, standardized collection of bird migration phenology.",
		"relevanceAndRelatedCBDTarget": "Aichi Targets: – . SDG: 13, 15.",
		"links": {
			"source":  "eneon:Phenology",		
			"measured by": ["eneon:ECSA", "eneon:GWOS", "eneon:ILTER", "eneon:SWOS"],
			"validated by": ["eneon:CEOS-LPV"],
			"relatedEV": ["eneon:Crop phenology","eneon:Fish abundance and distribution", "eneon:Marine turtles, birds, mammals abundance and distribution", "eneon:Hard coral cover and composition", "eneon:Seagrass cover and composition", "eneon:Macroalgal canopy cover and composition", "eneon:Mangrove cover and composition"]
		}		
	}
```  
* schema.json. Is the schema that rules and validates the json file. Here are expressed the definitions allowed, the links, etc.
* index.htm. The htm which shows the graph in the browser reading directly to the json file. This file must be indicated here.

## Graph including queries
The files for deploying this graph are included in the graph-vis folder.

You need to copy this folder locally, paying attention at the following files:
* network.json 
* conf_vis_schema.json
* index.htm
* conf_vis.json. In this file the desired queries over the network.json file are expressed. For example
```
{
  "description": "All EO networks NOT connected from SDG indicators",
  "connect": false,
  "direction": "back",
  "ini_node": {"supertype": null, "type": ["EONetwork"], "subtype": null},
  "excluded_intermediate_node": {"supertype": null, "type": ["SDG"], "subtype": null},
  "excluded_edge": ["relatedEV"],
  "bidirectional_edge": ["nationalNetwork", "contributor", "networkSitesDevelopement"],
  "end_node": {"supertype": ["SDGIndicator"], "type": null, "subtype": null}
},
```
