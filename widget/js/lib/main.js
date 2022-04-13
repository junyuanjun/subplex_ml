
// 'use strict';

var d3code = require('d3');
var d3lasso = require('d3-lasso')
// var d3slider = require('d3-simple-slider');
var d3 = Object.assign(d3code, {lasso:d3lasso.lasso});
window.d3=d3;

require('./projection.css');

// constant for svg
var margin = { right: 40, left: 40 };
// var color = ['#8dd3c7','#bebada','#fb8072','#80b1d3','#fdb462','#b3de69','#fccde5','#d9d9d9','#bc80bd','#ccebc5','#ffed6f']
var color = ["#6388b4","#ffae34","#ef6f6a","#8cc2ca","#55ad89","#c3bc3f","#bb7693","#baa094","#a9b5ae","#767676"];
// var divergence_color = ["#fff7ec", "#fee8c8", "#fdd49e", "#fdbb84", "#fc8d59", "#ef6548", "#d7301f", "#b30000", "#7f0000"];
var divergence_color = ["#fff7ec", "#fc8d59","#7f0000"];
var WIDTH = 300;
var HEIGHT = 300;
var aspect_ratio;
var circle_radius = 5;
var sliderWidth = 100;
var rect_size = 10;
var gwidth, gheight, xscale, yscale, colorScale;

// constant for table
var featureWidth = 236;
var distributionWidth = 100;
var groupTotal = WIDTH - featureWidth - distributionWidth;
var group_cell_width = 100;
var cellHeight = 40;
var cellMargin = {left: 0, right: 20, top: 5, bottom: 5};

var to_del = [];
var selected_feat = [], suggest_feat = [];
const unique = (value, index, self) => {
  return self.indexOf(value) === index
}

var create = function(that) {
	console.log('start create');

	// intialize the html
	that.el.setAttribute('class', 'd3-subplex');
	that.el.innerHTML = `
	<div class="row">
		<div class='col-sm-4'>
			<div class="card">
				<h3 class="card-header">SUBPLEX</h3>
				<div class="card-body">
					<div class='col' style="width: 300px">
						<div class="col" style="width: 300px;">
							<span>Suggest to Add <a class="add_all">add all</a> </span>
							<svg class="score_legend" width=300 height=20></svg>
							<div class="suggested_feat" style="flex-wrap: wrap; width:300px; max-height: 100px; overflow:auto"></div>
						</div>
						<div class="col">
							<span>Added Features:</span>
							<div class="added_feat" style="flex-wrap: wrap; width:300px; max-height:100px; overflow:auto"></div>
						</div>

						<div style="margin-top: 10px;width: 300px; margin-bottom:5px">
							<span>Add Feature of Interest:</span>
							<div class="row foi_div">
								<input id="add_feat_input" style="width:250px; height:30px; margin-right:10px"></input>
                <button class="btn btn-secondary  add_feat_btn">add</button>
							</div>
							<span id="err_hint" style="visibility: hidden; color: red; font-size: 10px">no such feature</span>
						</div>
						<div class="row cluster_btn" style="justify-content: start; margin-left: 0px">
							<button class="btn btn-secondary reset_feat">reset features</button>
							<button class="btn btn-secondary rerun_cluster" style="margin-left: 5px">re-cluster</button>
						</div>
					</div>
					
					<div id="projection">
						<svg class="scatterplot-svg"></svg>
					</div>
				</div>
			</div>
		</div>	
		<div class="col-sm-8">
			<div class="card">
					<h3 class="card-header">Details</h3>
					<div class="card-body">
						<div class="dt-buttons btn-group flex-wrap"> 
							<button class="btn btn-secondary add_group_btn" tabindex="0" aria-controls="datatable" type="button">
								<span>Add Subgroup</span>
							</button> 
							<button class="btn btn-secondaryn del_group_btn" tabindex="0" aria-controls="datatable" type="button">
								<span>Remove Subgroup</span>
							</button>
						</div>
					    <div style="overflow: auto">
							<div class="header-div" style="box-sizing: content-boxs; padding-right: 0px;">
								<table class="dataTable" id="datatable-header" class="stripe row-border order-column" style="width:100%">
								</table>
							</div>
							<div class="body-div" style="position: relative; overflow: auto; width: 100%; max-height: 400px;">
								<table class="dataTable" id="datatable-body" class="stripe row-border order-column" style="width:100%">
								</table>
							</div>
						</div>
					</div>
			</div>
		</div>
	</div>
	`
	window.dom = that.el;
	render(that);
}

var render = function(that) {
	console.log('start render');

	aspect_ratio = that.model.get('aspect_ratio');
	var svgElmt = that.el.getElementsByClassName('scatterplot-svg')[0];
	svgElmt.setAttribute('width', WIDTH);
	svgElmt.setAttribute('height', WIDTH/aspect_ratio);
	var svg = d3.select(svgElmt);
	window.svg = svg;

	// svg for feature div
	var feat_div = that.el.getElementsByClassName('suggested_feat')[0];
	window.feat_div = d3.select(feat_div);
	var added_div = that.el.getElementsByClassName('added_feat')[0];
	window.added_div = d3.select(added_div);


	// var run_btn = that.el.getElementsByClassName('run_btn')[0];
	// d3.select(run_btn)
	// 	.on('click', ()=>click_run(that))

	// intialize buttons
	var add_group_btn = that.el.getElementsByClassName('add_group_btn')[0];
	d3.select(add_group_btn)
		.on('click', ()=> {
			if (that.model.get('examples').length > 0) {
				click_add(that);
			}
		});
	var del_group_btn = that.el.getElementsByClassName('del_group_btn')[0];
	d3.select(del_group_btn)
		.on('click', () => {
			if (to_del.length > 0) {
				click_del(that);
			}
		});

	var add_feat_btn = that.el.getElementsByClassName('add_feat_btn')[0];
	d3.select(add_feat_btn)
		.on('click', () => {
			// look for the features
			// get the divergence score
			let feat = d3.select('#add_feat_input')._groups[0][0].value;
			let res = feat_formalize(that, feat);
			// add to the list and ui
			if (res === "error") {
				d3.select('#err_hint')
					.style('visibility', "visible");
			} else {
				d3.select('#err_hint')
					.style('visibility', "hidden");
				d3.select('#add_feat_input')._groups[0][0].value = "";
				add_feat_added_div(res, selected_feat.length, "manual", -1);
			}
		})

	var reset_feat_btn = that.el.getElementsByClassName('reset_feat')[0];
	d3.select(reset_feat_btn)
		.on('click', () => {
			selected_feat = [];
			window.added_div.selectAll('.feat_div').remove();
			window.feat_div.selectAll('.feat_div').remove();
			render_feature_suggestion(that);
		})

	var add_all_btn = that.el.getElementsByClassName('add_all')[0];
	d3.select(add_all_btn)
		.on('click', () => {
			suggest_feat.forEach(obj => {
				add_feat_added_div(obj['feat_name'], selected_feat.length, "recommend", obj['score']);
			});
			window.feat_div.selectAll('.feat_div').remove();
			suggest_feat = [];
		})

	var rerun_clt_btn = that.el.getElementsByClassName('rerun_cluster')[0];
	d3.select(rerun_clt_btn)
		.on('click', () => {
			click_rerun(that);
		})


	// render checkbox
	// var checkbox_obj = that.el.getElementsByClassName('show_highlight')[0];
	// d3.select(checkbox_obj)
	// 	.on('click', () => {
	// 		var checked =  that.model.get('show_highlight');
	// 		that.model.set({'show_highlight': 1-checked})
	// 		that.touch();
	// 	});

	// // render slider
	// var slider_obj =  that.el.getElementsByClassName('slider')[0];
	// slider_obj.oninput = function() {
	// 	that.model.set({ 'sparse_extent': +this.value });
	// 	that.touch();
	// }

	// render the initial views
	render_projection(that);
	render_table(that);
	render_legend(that);
	render_feature_suggestion(that);
}

var render_projection = function(that) {
	var svg = window.svg;

	console.log('render_projection');
	var dots = conf2pos(that.model.get('config'), that.model.get('projection'),
		that.model.get('labels'), 
		that.model.get('cluster_num'),
		that.model.get('examples'),
		that.model.get('outlier_labels'),
		that.model.get('sparse_extent'));
	var center_pos = center_info(that.model.get('projection'),
			that.model.get('centers')),
		sparse_extent = that.model.get('sparse_extent'),
		show_highlight = that.model.get('show_highlight');

	gwidth = +svg.attr('width') - margin.left - margin.right;
	gheight = +svg.attr('height');

	var ext = d3.extent(dots, d => d.x);
	xscale = d3.scaleLinear()
		.domain([ext[0],ext[1]])
		.range([margin.left, gwidth])

	ext = d3.extent(dots, d => d.y);
	yscale = d3.scaleLinear()
		.domain([ext[0],ext[1]])
		.range([gheight-20, 20]);

	svg.select('#scatterplot').remove();
	var scatterplot = svg.append('g')
		.attr('id', 'scatterplot')
		.attr('width', gwidth)
		.attr('height', gheight)
	
	console.log('create scatterplot');

	var selected_group = that.model.get("group_selected");
	var points = scatterplot.selectAll('.dot')
		.data(dots)
		.enter()
		.append('circle')
		.classed('dot', true)
		.classed('outlier', d=>d.outlier)
		.classed('dot_highlight', d=>d.brush_selected)
		.attr('id', d=>`dot-${d.idx}`)
		.attr('cx', d=> d.outlier ? xscale(d.x*sparse_extent) : xscale(d.x))
		.attr('cy', d=> d.outlier ? yscale(d.y*sparse_extent ): yscale(d.y))
		.attr('r', circle_radius)
		.attr('fill', (d) => 
			color[d.label % color.length]
		)
		.attr('fill-opacity', d=> ((d.label === selected_group || d.brush_selected) ? .8 :  selected_group < 0 ? .6 : .1))
		.attr('stroke', d => d.brush_selected ? 'black' : 'none');

	var examples = that.model.get('examples');
	if (examples.length < 50) {
		var push_forward = [];
		examples.forEach(idx => {
			push_forward.push(dots[idx]);
		})
		scatterplot.selectAll('.push_forward')
			.data(push_forward)
			.enter()
			.append('circle')
			.classed('outlier', d=>d.outlier)
			.classed('push_forward', true)
			.attr('cx', d=> d.outlier ? xscale(d.x*sparse_extent) : xscale(d.x))
			.attr('cy', d=> d.outlier ? yscale(d.y*sparse_extent) : yscale(d.y))
			.attr('r', circle_radius)
			.attr('fill', d=>
				(d.outlier) ? 'grey' : color[d.label % color.length]
			)
			.attr('fill-opacity', .8)
			.attr('stroke', 'black');
	}
	

	scatterplot.selectAll('rect')
		.data(center_pos)
		.enter()
		.append('rect')
		.attr('x', d=>xscale(d.x)-rect_size/2)
		.attr('y', d=>yscale(d.y)-rect_size/2)
		.attr('width', rect_size)
		.attr('height', rect_size)
		.attr('fill', (d) => color[d.label % color.length])
		.attr('stroke', 'black')
		.attr('stroke-width', 1.5)
		.on('click', (d)=> {
			sync_group_selected(that, d.label)
		})

	// Lasso functions
	svg.select(".lasso").remove();
	var lasso_start = function () {
		lasso.items()
			// .attr("r", 3.5) // reset size
			.classed("not_possible", true)
			.classed("selected", false);
	};

	var lasso_draw = function () {

		// Style the possible dots
		lasso.possibleItems()
			.classed("not_possible", false)
			.classed("possible", true);

		// Style the not possible dot
		lasso.notPossibleItems()
			.classed("not_possible", true)
			.classed("possible", false);
	};

	var lasso_end = function () {
		// Reset the color of all dots
		lasso.items()
			.classed("not_possible", false)
			.classed("possible", false);

		let select={},count=0, examples=[];
		// for(let i =0; i<self.clusterId;i++){
		// 	select[i]=[]
		// }
		// Style the selected dots
		lasso.selectedItems()
			.classed("selected", true)
			.each((d)=>{
				count+=1
				// select[d.label].push(self.clusters[d.label]['attr'][d.idx])
				examples.push(d.idx);
			})
		console.log(examples);
		sync_examples(that, examples);

		// Reset the style of the not selected dots
		lasso.notSelectedItems()
		// .attr("r",3.5);
	};

	var lasso = d3.lasso()
		.closePathSelect(true)
		.closePathDistance(100)
		.items(points)
		.targetArea(svg)
		.on("start", lasso_start)
		.on("draw", lasso_draw)
		.on("end", lasso_end);

	svg.call(lasso);
}

var render_legend = function(that) {
	var svg = d3.select(that.el.getElementsByClassName('score_legend')[0]);

	svg.append('text')
		.attr('x', 5)
		.attr('y', 15)
		.attr('text-anchor', "start")
		.text('low')
	svg.append('text')
		.attr('x', 200)
		.attr('y', 15)
		.attr('text-anchor', "start")
		.text('high feat. score')

	var grad = svg.append('defs')
		.append('linearGradient')
		.attr('id', 'grad')
		.attr('x1', '0%')
		.attr('x2', '100%')
		.attr('y1', '0%')
		.attr('y2', '0%');

	grad.selectAll('stop')
		.data(divergence_color)
		.enter()
		.append('stop')
		.style('stop-color', function(d){ return d; })
		.attr('offset', function(d,i){
		  return 100 * (i / (divergence_color.length - 1)) + '%';
		})

	svg.append('rect')
		.attr('x', 30)
		.attr('y', 5)
		.attr('width', 168)
		.attr('height', 10)
		.style('fill', 'url(#grad)');
}

add_feat_suggest_div = function(feat_name, feat_ix, score) {
    let str = feat_name;
    suggest_feat.push({
    	"feat_name": feat_name,
    	"score": score,
    });
    
    let feat_div = window.feat_div.append("div")
        .attr("class", "feat_div")
        .attr('id', `feat_suggest-${feat_ix}`)
        .style('background', colorScale(score));

    feat_div.append('div')
        .attr('class', 'feat_content feat_suggest')
        .text(str);

    feat_div.append('div')
        .attr('class', 'feat_content')
        .text('+')
        .on('click', function() {
            let fix = +this.parentNode.id.split('-')[1];
            
            // add to the added list
            console.log("added one,", selected_feat);
            add_feat_added_div(suggest_feat[fix]['feat_name'], selected_feat.length, "recommend", suggest_feat[fix]['score']);
        		// remove from recommend list
        		delete suggest_feat[fix];
            this.parentNode.parentNode.removeChild(this.parentNode);
          })
}

add_feat_added_div = function(feat_name, feat_ix, source, score) {
    let str = feat_name;
    selected_feat.push({
    	'feat_name': feat_name,
    	'source': source,
    	'score': score,
    })
    
    let feat_div = window.added_div.append("div")
        .attr("class", "feat_div")
        .attr('id', `feat_added-${feat_ix}`)
        .style('background', `rgba(192, 192, 192,.5)`);

    feat_div.append('div')
        .attr('class', 'feat_content')
        .text(str);

    feat_div.append('div')
        .attr('class', 'feat_content')
        .text('x')
        .on('click', function() {
            let fix = +this.parentNode.id.split('-')[1];
            // add back to recommend
            if (selected_feat[fix]['source'] == "recommend") {
            	add_feat_suggest_div(selected_feat[fix]['feat_name'], suggest_feat.length, selected_feat[fix]['score'])
            }
            // remove from the added feature list
            delete selected_feat[fix];
            this.parentNode.parentNode.removeChild(this.parentNode);
        })
}

var render_feature_suggestion = function(that) {
	console.log('render_feature_suggestion');
	window.feat_div.selectAll('.feat_div').remove();

	var vis_stat = that.model.get('vis_stat');
	let var_min = vis_stat.reduce((res, curr) => res < curr.var_score ? res : curr.var_score),
		var_max = vis_stat.reduce((res, curr) => res > curr.var_score ? res : curr.var_score);

	colorScale = d3.scaleLinear()
		.domain([var_min, (var_min+var_max)/2, var_max])
		.range(divergence_color);

	vis_stat.sort((a, b) => b.var_score - a.var_score);

	suggest_feat = [];
	for (let i = 0; i < that.model.get('num_recommend'); i++) {
		add_feat_suggest_div(vis_stat[i]['name'], suggest_feat.length, vis_stat[i]['var_score']);
	}
}

var render_table = function(that) {
	var header_div = that.el.getElementsByClassName('header-div')[0];
	var table_width = (group_cell_width+2) * that.model.get('group_num') + featureWidth + distributionWidth + 2 *2;
	d3.select(header_div)
		.attr('style', `box-sizing: content-boxs; padding-right: 0px; width: ${table_width}px;`)
	var body_div = that.el.getElementsByClassName('body-div')[0];
	d3.select(body_div)
		.attr('style', `position: relative; overflow-y: auto; max-height: 500px; width: ${table_width}px;`)
	var tables = that.el.getElementsByClassName('dataTable')

	// add column names
	var header_table = d3.select(tables[0]);
	header_table.selectAll('thead').remove();
	var header = header_table.append('thead')
		.append('tr')
		.attr('class', 'row')
		.attr('style', 'margin-left: 0px;');
	// var group_cell_width = groupTotal / that.model.get('cluster_num');
	var header_dict = generate_header_info(group_cell_width, that.model.get('group_num'));
	var header_th = header.selectAll('th')
		.data(header_dict)
		.enter()
		.append('th')
		.attr('class', (d, ix) => {
			var className = 'sorting';
			if (that.model.get('sort_column') == ix) {
				className = 'sorting_asc';
				if (!that.model.get('ordering_asc')) {
					className = 'sorting_desc';
				}
			}
			return className;
		})
		.attr('style', d => `width: ${d.w}px; padding-left: 20px; padding-right: 0px; margin-left: 1px; margin-right: 1px;`);

	header_th.append('label')
		.text(d => d.name)
		.on('click', (d, ix)=> {
			sort_table(that, ix);
		});

	var groups = header_th._groups[0];
	for (var i = that.model.get('cluster_num')+1; i <= that.model.get('group_num'); i++) {
		// groups[i].innerHTML = `${'Group '+ i}
		// 	<input type='checkbox' className=${'group-'+(i-1)}>`;
		var item = d3.select(groups[i]);
		item.append('input')
			.attr('type', 'checkbox')
			.property('checked', false)
			.on('change', (e) => {
				console.log('changed');
				var idx = +e.name.split(' ')[1] - 1;
				to_del.push(idx);
			})
	}

	// add table content
	var content_table = d3.select(tables[1]);
	content_table.selectAll('tbody').remove();
	var table_body = content_table.append('tbody');
	var vis_stat = that.model.get('vis_stat');
	var selected_stat = that.model.get('selected_stat');
	var attr_range = that.model.get('attr_range');
	var selected_group = that.model.get('group_selected');

	// sort based on column
	var sorted_idx;
	if (selected_stat.length > 0) {
		sorted_idx = generated_sorted_index(that.model.get('sort_column'), that.model.get('group_num'),
			selected_stat, that.model.get('config')['features'], that.model.get('ordering_asc'));
	} else {
		sorted_idx = generated_sorted_index(that.model.get('sort_column'), that.model.get('group_num'),
			vis_stat, that.model.get('config')['features'], that.model.get('ordering_asc'));
	}
	that.model.set({ feature_column: sorted_idx});
	that.touch();
	for (var ii = 0; ii < vis_stat.length; ii++) {
		var i = sorted_idx[ii];
		var row = table_body.append('tr');
		// add feature name
		row.append('td')
			.text(vis_stat[i]['name'])
			.attr('style', `width: ${featureWidth}px;`);
		// add attribution bars
		for (var j = 0; j < that.model.get('group_num'); j++) {
			var cell = row.append('td')
				.attr('style', `width: ${group_cell_width}px; padding:1px;`);
			var attrHeight = cellHeight;

			if (selected_stat.length > 0) {
				attrHeight = cellHeight / 2.0;
				if (selected_stat[i]['group'+j] !== 'no') {
					cell.append('div')
					.attr('style', `height:${attrHeight}px; width:${selected_stat[i]['group'+j]*100}%;
						background:${color[j % color.length]}; border:black 1px solid; 
						opacity: ${j === selected_group ? 1 : selected_group < 0 ? .8 : .3}`);
			
				} else {
					cell.append('div')
						.attr('style', `height:${attrHeight}px; width:100%; 
							background:white;`);
				}
			}
			cell.append('div')
				.attr('style', `height:${attrHeight}px; width:${vis_stat[i]['group'+j]*100}%;
					background:${color[j % color.length]}; 
					${selected_stat.length > 0 ? "": "border:black 1px solid"}; 
					opacity: ${(j === selected_group || selected_group < 0) ? .8 : .2}`);
		}
		// add distribution line
		var dstr_cell = row.append('td')
				.append('svg')
				.attr('width', distributionWidth)
				.attr('height', cellHeight);
		var dstr_yscale = d3.scaleLinear()
				.domain([vis_stat[i]['kde_max'], 0])
				.range([5, cellHeight-2]);
		var bin_size = vis_stat[i]['distribution'][0].length
		for (var j = 0; j < that.model.get('group_num'); j++) {
			dstr_cell.append('path')
				.datum(vis_stat[i]['distribution'][j])
				.attr("fill", color[j % color.length])
				.attr('fill-opacity', .3)
				.attr("stroke", color[j % color.length])
				.attr("d", d3.line()
					.x(function(d, i) { return i * distributionWidth / bin_size })
					.y(function(d) { return dstr_yscale(d) }));
			if (selected_stat.length > 0) {
				dstr_cell.append('path')
					.datum(selected_stat[i]['distribution'])
					.attr("fill", 'gray')
					.attr('fill-opacity', .3)
					.attr("stroke", 'gray')
					.attr("d", d3.line()
						.x(function(d, i) { return i * distributionWidth / bin_size })
						.y(function(d) { return dstr_yscale(d) }));
			}
		}
	}

}

function generate_header_info(cell_width, group_num) {
	var info = [
		{'name': 'Features', 'w': featureWidth-20},
	];
	for (var i = 1; i <= group_num; i++) {
		info.push({'name': 'Group ' + i, 'w': cell_width-20,});
	}
	info.push({'name': 'Distribution (low→high)', 'w': distributionWidth-20});
	return info;
}

function generated_sorted_index(sort_column, group_num, stat, features, ordering_asc) {
	var to_sort = [];
	if (sort_column==0) {
		// sort by sum of attributions
		stat.forEach((obj, ix) => {
			to_sort.push({
				val: obj.attr_sum,
				id: ix,
			})
		});
	} else if (sort_column <= group_num) {
		// sort by group stat value
		stat.forEach((obj, ix) => {
			to_sort.push({
				val: obj['group'+(sort_column - 1)],
				id: ix,
			})
		});
	} else {
		stat.forEach((obj, ix) => {
			to_sort.push({
				val: obj.divergence,
				id: ix,
			})
		});
	}
	if (ordering_asc) {
		to_sort.sort((a, b) => a['val']-b['val']);
	} else {
		to_sort.sort((a, b) => b['val']-a['val']);	
	}
	var sorted_idx = [];
	to_sort.forEach(obj => sorted_idx.push(obj['id']));
	return sorted_idx;
}

var sync_examples = function(that, arr) {
	that.model.set({ 'examples': arr.filter(unique), 'group_selected': -1 });
	// that.model.save_changes();
	that.touch();
}

var sync_cluster_num = function (that, h) {
	that.model.set({ 'cluster_num': h });
	// that.model.save_changes();
	that.touch();
};

var sync_group_selected = function (that, idx) {
	if (idx == that.model.get('group_selected')) {
		that.model.set({'group_selected': -1, examples: []});
	} else {
		that.model.set({ 'group_selected': idx, examples: []});
	}
	that.touch();
}

var click_run = function (that) {
	// var cluster_num = +that.el.getElementsByTagName('input')[0].value;
	// if (cluster_num > 1) {
	// 	that.model.set({'cluster_num': cluster_num});
	// }
	var dist_func = that.el.getElementsByTagName('select')[0].value;
	that.model.set({'distance_func': dist_func});
	that.touch();
}

var click_add = function (that) {
	that.model.set({'to_add': 1 - that.model.get('to_add')});
	that.model.set({'group_num': that.model.get('group_num')+1});
	that.touch();
}

var click_del = function (that) {
	that.model.set({'to_del': to_del});
	that.model.set({'click_del': 1-that.model.get('click_del')});
	to_del = [];
	that.touch();
}

// update clustering
var click_rerun = function (that) {
	var selected_feat_names = [];
	selected_feat.forEach(obj => {
		selected_feat_names.push(obj['feat_name']);
	})
	that.model.set({"selected_feat": selected_feat_names});
	that.touch();
}

// create scatterplot
var conf2pos = function(data, projection, labels, n_cluster, examples, outlier_labels, sparse_extent) {
	var list = [];
	// console.log('in conf2pos');
	// console.log(data['x'].length);
	for (var i = 0; i < projection.length; i++) {
		list.push({
			// 'x': data['x'][i],
			// 'y': data['y'][i],
			'x': projection[i][0],
			'y': projection[i][1],
			// 'label': data['labels'][n_cluster.toString()][i],
			'label': 0,
			'idx': i,
			'outlier': false,
			'brush_selected': false,
		});
	}

	examples.forEach((idx)=>list[idx]['brush_selected']=true);

	for (var i = 0; i < labels.length; i++) {
		labels[i].forEach((idx) => {
			if (outlier_labels[idx] == -1) 
				list[idx]['outlier'] = true;	
			list[idx]['label'] = i;
		});
	}
	// console.log('list length', list.length);
	return list;
}

var center_info = function(projection, centers) {
	var center_pos = []
	for (var i = 0; i < centers.length; i++) {
		center_pos.push({
			// 'x': data['x'][centers[i]],
			// 'y': data['y'][centers[i]],
			'x': projection[centers[i]][0],
			'y': projection[centers[i]][1],
			'label': i,
			'idx': i,
		})
	}
	return center_pos;
}

var cluster_num_changed = function (that) {

	var prev_h = that.model.previous('cluster_num');
	var new_h = that.model.get('cluster_num');
	// debug
	console.log('prev_h = ' + prev_h + ', new_h = ' + new_h);

	// $('#value-text').text(new_h);
	render_table(that);
};

var labels_changed = function(that) {
	render_projection(that);
	render_table(that);
	render_feature_suggestion(that);
}

var sort_table = function(that, ix) {
	if (that.model.get('sort_column') === ix) {
		that.model.set({'ordering_asc': 1 - that.model.get('ordering_asc')});
	} else {
		that.model.set({'ordering_asc': true});
	}
	that.model.set({'sort_column': ix})
	render_table(that);
}

var group_selected_changed = function(that) {
	console.log("select group", that.model.get('group_selected'))
	render_projection(that);
	render_table(that);
}

var examples_changed = function(that) {
	render_projection(that);
	render_table(that);
}

var outlier_setting_changed = function(that) {
	var checked = that.model.get('show_highlight');

	if (checked) {
		var sparse_extent = +that.model.get('sparse_extent');

		d3.selectAll('.outlier')
			.attr('fill', 'grey')
			.attr('cx', d=>xscale(d.x*sparse_extent))
			.attr('cy', d=>yscale(d.y*sparse_extent));
	} else {
		d3.selectAll('.outlier')
			.attr('fill', d=>color[d.label % color.length])
			.attr('cx', d=>xscale(d.x*sparse_extent))
			.attr('cy', d=>yscale(d.y*sparse_extent));
	}
	
}


var feat_formalize = function(that, feature) {
    let feat = remove_beginning_space(feature).toLowerCase();
    
    // name check
		var vis_stat = that.model.get('vis_stat');
		for (let i = 0; i < vis_stat.length; i++) {
			let obj = vis_stat[i], 
				feat_name = obj.name.toLowerCase();
			if (feat_name === feat) {
				return obj.name;
			}
		}
    return "error";
}

function remove_beginning_space(str) {
    let pos = 0;
    while (pos<str.length && str[pos] == ' ') {
        pos++;
    }
    return str.substring(pos);
}

var view = {
	create: create,
	labels_changed: labels_changed,
	group_selected_changed: group_selected_changed,
	examples_changed: examples_changed,
	outlier_setting_changed: outlier_setting_changed,
};

module.exports = view;

