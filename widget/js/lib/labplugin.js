var plugin = require('./index');
var base = require('@jupyter-widgets/base');

module.exports = {
  id: 'subplex_ml:plugin',
  requires: [base.IJupyterWidgetRegistry],
  activate: function(app, widgets) {
      widgets.registerWidget({
          name: 'subplex_ml',
          version: plugin.version,
          exports: plugin
      });
  },
  autoStart: true
};

