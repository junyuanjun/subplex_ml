import ipywidgets as widgets
from traitlets import Unicode, Float, Int, Dict, List
from traitlets import observe
import pandas as pd
import numpy as np
from . import clustering_with_rank_distances as cluster
from . import util
from sklearn.metrics import pairwise_distances
from sklearn.decomposition import PCA

import matplotlib.pyplot as plt
import numpy as np

import numpy as np
import matplotlib as mpl
from cycler import cycler

# See js/lib/example.js for the frontend counterpart to this file.

@widgets.register
class SubplexVis(widgets.DOMWidget):
    # Name of the widget view class in front-end
    _view_name = Unicode('SubplexView').tag(sync=True)

    # Name of the widget model class in front-end
    _model_name = Unicode('SubplexModel').tag(sync=True)

    # Name of the front-end module containing widget view
    _view_module = Unicode('subplex_ml').tag(sync=True)

    # Name of the front-end module containing widget model
    _model_module = Unicode('subplex_ml').tag(sync=True)

    # Version of the front-end module containing widget view
    _view_module_version = Unicode('0.1.0').tag(sync=True)
    # Version of the front-end module containing widget model
    _model_module_version = Unicode('0.1.0').tag(sync=True)

    # Widget specific property.
    # Widget properties are defined as traitlets. Any property tagged with `sync=True`
    # is automatically synced to the frontend *any* time it changes in Python.
    # It is synced back to Python from the frontend *any* time the model is touched.
    value = Unicode('Hello World!').tag(sync=True)

    cluster_num = Int(7).tag(sync=True)
    distance_func = Unicode("spearman").tag(sync=True)
    config = Dict({}).tag(sync=True)
    projection = List([]).tag(sync=True)
    aspect_ratio = Float(1).tag(sync=True)
    examples = List([]).tag(sync=True)
    labels = List([]).tag(sync=True)
    centers = List([]).tag(sync=True)
    group_selected = Int(-1).tag(sync=True)
    vis_stat = List([]).tag(sync=True)
    selected_stat = List([]).tag(sync=True)
    attr_range = List([]).tag(sync=True)
    to_add = Int(-1).tag(sync=True)
    to_del = List([]).tag(sync=True)
    click_del = Int(0).tag(sync=True)
    group_num = Int(7).tag(sync=True)
    outlier_labels = List([]).tag(sync=True)
    sparse_extent = Float(1.5).tag(sync=True)
    feature_column = List([]).tag(sync=True)
    selected_feat = List([]).tag(sync=True)
    num_recommend = Int(6).tag(sync=True)

    distance = []
    original_attributions = []
    intialized = False

    widget_color = ["#6388b4","#ffae34","#ef6f6a",
        "#8cc2ca", "#55ad89","#c3bc3f","#bb7693",
        "#baa094", "#a9b5ae","#767676"]
    group_color = ["#7fc97f", "#beaed4", "#fdc086", "#ffff99",
    "#386cb0", "#f0027f", "#bf5b17"]

    # def set_config(self, config):
    #     config['features'] = list(config['features'])
    #     self.original_attributions = np.array(config['attributions'])
    #     config['attributions'] = util.process_attribution(config['attributions'])

    def initialize(self, config, 
        cluster_obj=None, plain_labels=None, projection=None, alpha=0.9):

        '''initialize attributions and feature names'''
        if ('features' in config and 'attributions' in config):
            config['features'] = list(config['features'])
            self.original_attributions = np.array(config['attributions'])
            config['attributions'] = util.process_attribution(config['attributions'])
            self.data_df = pd.DataFrame(data = config['rawdata'], columns=config['features'])
            self.real_min = np.min(config['attributions'], axis=0)
            self.real_max = np.max(config['attributions'], axis=0)
        else:
            raise Exception("The para:config should include key \'features\' and \'attributions\'.")

        '''initialize clustering labels'''
        if (plain_labels is None):
            if (cluster_obj is None):
                raise Exception("You should either input clustering lables or a clustering algorithm.")
            self.plain_labels = util.run_clustering(cluster_obj, np.array(config['attributions']))
            self.cluster_obj = cluster_obj
            
        self.labels, self.cluster_num = util.reform_labels(self.plain_labels)
        self.group_num = self.cluster_num
        self.alpha = alpha

        '''initialize projection'''
        # X_normalized = PCA(n_components=5).fit_transform(np.array(config['attributions']))
        if (projection is None):
            # projection = util.run_projection(X_normalized)
            projection = util.run_projection(np.array(config['attributions']))

        '''set configuration'''
        aspect_ratio = (np.max(projection, axis=0)[0] - np.min(projection, axis=0)[0]) / (np.max(projection, axis=0)[1] - np.min(projection,axis=0)[1])
        self.aspect_ratio = float(aspect_ratio)
        self.distance = pairwise_distances(projection)
        self.config = config
        self.projection = projection.tolist()
        
        if (self.intialized):
            return 
        self.centers = util.get_cluster_medoid(distance=self.distance, labels=self.labels)
        self.change_vis_stat()
        self.intialized = True

    def change_vis_stat(self):
        self.vis_stat, self.attr_range = util.generate_stat(attributions=np.array(self.config['attributions']), 
            labels=self.labels, columns=self.config['features'], 
            real_min=self.real_min, real_max=self.real_max, 
            plain_labels=self.plain_labels)
        return self

    def plot_val_histogram(self, col, show_group=None):
        fig, axarr = plt.subplots(figsize=(7,5))
        if (show_group == None):
            for i in range(len(self.labels)):
                axarr.hist(self.data_df.iloc[self.labels[i]][col],
                    color=self.widget_color[i%10],
                    bins=10, alpha = 0.8, label="group"+str(i+1))
        else:
            for i in show_group:
                axarr.hist(self.data_df.iloc[self.labels[i-1]][col], 
                    color=self.widget_color[(i-1)%10],
                    bins=10, alpha = 0.8, label="group"+str(i))
        axarr.set_xlabel("value")
        axarr.set_ylabel("count")
        fig.suptitle("histogram of "+ col+" in groups", size=16)
        axarr.legend()
        plt.show()

    def plot_customized_expl(self, groups, col):
        fig, axarr = plt.subplots(figsize=(7,5))
        df = pd.DataFrame(data=self.config['attributions'], columns=self.config['features'])
        for i in range(len(groups)):
            axarr.hist(df.iloc[groups[i]['index']][col], bins=10, 
                color=self.group_color[i%7], label=groups[i]['label'], alpha=0.8)
        axarr.set_xlabel("value")
        axarr.set_ylabel("count")
        fig.suptitle("histogram of explanations for "+ col, size=16)
        axarr.legend()
        plt.show()


    @observe('cluster_num')
    def set_num_cluster(self, cluster_num):
        # print("change value", self.cluster_num)
        if (not self.intialized):
            return self
        self.group_num = self.cluster_num
        self.centers, self.labels = cluster.kMedoidClustering(self.distance, self.cluster_num)
        self.change_vis_stat()
        return self

    @observe('distance_func')
    def change_distance_func(self, distance_func):
        if (self.distance_func == 'spearman'):
            if (self.config['distance']):
                self.distance = self.config['distance']['spearman']
            else:
                self.distance = cluster.pairwise_spearman_distance_matrix(np.array(self.config["attributions"]))
        elif (self.distance_func == 'ktau'):
            if (self.config['distance']):
                self.distance = self.config['distance']['ktau']
            else:
                self.distance = cluster.pairwise_ktau_distance_matrix(np.array(self.config["attributions"]))

        self.centers, self.labels = cluster.kMedoidClustering(self.distance, self.cluster_num)
        self.change_vis_stat()
        return self

    @observe('examples')
    def change_selected_examples(self, examples):
        self.selected_stat = util.generate_selected_stat(
            attributions=np.array(self.config['attributions']), 
            labels=self.labels, columns=self.config['features'], 
            examples=self.examples, general_stat=self.vis_stat,
            real_min=self.real_min, real_max=self.real_max)
        return self

    @observe('to_add')
    def add_group(self, to_add):
        self.centers, self.labels = util.add_group(centers=list(self.centers), labels=list(self.labels), 
            distance=self.distance, new_group=self.examples)
        self.examples = []
        self.selected_stat = []
        self.change_vis_stat()
        return self

    @observe('click_del')
    def del_group(self, click_del):
        num_del = 0
        if (len(self.to_del) > 0):
            num_del, self.centers, self.labels = util.remove_group(centers=list(self.centers), labels=list(self.labels), to_del=self.to_del)
            self.to_del = []
        self.examples = []
        self.selected_stat = []
        self.group_num = self.group_num - num_del
        self.change_vis_stat()
        return self

    @observe('selected_feat')
    def update_cluster_proj(self, selected_feat):
        print('updating projection and clustering')
        '''get indices of selected features'''
        feat_weight = util.derive_feat_weight(self.config['features'], self.selected_feat, self.alpha, self.vis_stat)
        
        '''update clustering'''
        weighted = np.array(self.config['attributions'])*feat_weight

        self.plain_labels = util.run_clustering(self.cluster_obj, weighted)

        self.labels, self.cluster_num = util.reform_labels(self.plain_labels)
        self.group_num = self.cluster_num

        '''update projection'''
        # X_normalized = PCA(n_components=5).fit_transform(weighted)
        # self.projection = util.run_projection(X_normalized).tolist()
        self.projection = util.run_projection(weighted).tolist()
        # self.config['x'] = projection[:,0].tolist()
        # self.config['y'] = projection[:,1].tolist()

        self.distance = pairwise_distances(self.projection)
        self.centers = util.get_cluster_medoid(distance=self.distance, labels=self.labels)

        self.change_vis_stat()
        return self

    def get_selection(self):
        if (len(self.examples) > 0):
            selected_idx = self.examples
            selected = pd.DataFrame(columns=self.config['features'], 
                data=np.array(self.config['attributions'])[selected_idx])
        elif (self.group_selected >= 0):
            selected_idx = self.labels[self.labels==self.group_selected]
            selected = pd.DataFrame(columns=self.config['features'], 
                data=np.array(self.config['attributions'])[selected_idx])
        else:
            selected = pd.DataFrame()
        return selected

    def get_selected_stat(self):
        feats = ['group_id']
        feats.extend(self.config['features'])
        data = []
        if (len(self.examples) > 0):
            for i in range(self.group_num):
                res = []
                res.append('group'+str(i+1))
                for j in range(len(feats)-1):
                    res.append(self.selected_stat[j]['group'+str(i)])
                data.append(res)
            df = pd.DataFrame(columns=feats, data=data)
        else:
            df = pd.DataFrame(columns=feats)
        return df

    def get_vis_stat(self):
        feats = ['group_id']
        feats.extend(self.config['features'])
        data = []
        for i in range(self.group_num):
            res = []
            res.append('group'+str(i+1))
            for j in range(len(feats)-1):
                res.append(self.vis_stat[j]['group'+str(i)])
            data.append(res)
        df = pd.DataFrame(columns=feats, data=data)
        return df

    def set_highlight_instance(self, examples):
        self.examples = examples
        return 
