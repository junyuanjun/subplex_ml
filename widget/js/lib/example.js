var widgets = require('@jupyter-widgets/base');
var _ = require('lodash');
let d3_subplex = require('./main');


// See example.py for the kernel counterpart to this file.


// Custom Model. Custom widgets models must at least provide default values
// for model attributes, including
//
//  - `_view_name`
//  - `_view_module`
//  - `_view_module_version`
//
//  - `_model_name`
//  - `_model_module`
//  - `_model_module_version`
//
//  when different from the base class.

// When serialiazing the entire widget state for embedding, only values that
// differ from the defaults will be specified.
var SubplexModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name : 'SubplexModel',
        _view_name : 'SubplexView',
        _model_module : 'subplex_ml',
        _view_module : 'subplex_ml',
        _model_module_version : '0.1.0',
        _view_module_version : '0.1.0',
        value : 'Hello World!',

        cluster_num: 7,
        config: {},
        projection: [],
        labels: [],
        examples: [],
        selected_stat: [],
        group_selected: -1,
        sort_column: 0,
        ordering_asc: true,
        to_add: 0,
        to_del: [],
        click_del: 0,
        group_num: 7,
        outlier_label: [],
        sparse_extent: 1.5,
        show_highlight: false,

        feature_column: [],
        group_idx: [],

        selected_feat: [],
        num_recommend: 6,
    })
});


// Custom View. Renders the widget model.
var SubplexView = widgets.DOMWidgetView.extend({
    // Defines how the widget gets rendered into the DOM
    render: function() {
        console.log('Subplex ProjectionView start render');

        // explicit
        let that = this;

        this.loadAndCreateToolElement();

        // event listener to change visualization
        // that.model.on('change:value', that.value_changed, that);
        // that.model.on('change:labels', that.labels_changed, that);
        that.model.on('change:group_selected', that.group_selected_changed, that);
        that.model.on('change:selected_stat', that.selected_stat_changed, that);
        that.model.on('change:vis_stat', that.labels_changed, that);
        that.model.on('change:sparse_extent', that.sparse_extent_change, that);
        that.model.on('change:show_highlight', that.show_highlight_change, that)

        // debug
        window.dom = that.el;
    },

    // value_changed: function() {
    //     this.el.textContent = this.model.get('value');
    // }

    labels_changed: function() {
        let that = this;
        d3_subplex.labels_changed(that);
    },

    group_selected_changed: function() {
        let that = this;
        d3_subplex.group_selected_changed(that);
    },

    selected_stat_changed: function() {
        let that = this;
        d3_subplex.examples_changed(that);
    },

    sparse_extent_change: function() {
        let that = this;
        d3_subplex.outlier_setting_changed(that);
    },

    show_highlight_change: function() {
        let that = this;
        d3_subplex.outlier_setting_changed(that);
    },

    loadAndCreateToolElement: function() {
        let that = this;

        // // build svg and append it to dom
        d3_subplex.create(that);
    },
});


module.exports = {
    SubplexModel: SubplexModel,
    SubplexView: SubplexView
};
