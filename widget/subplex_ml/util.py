import numpy as np
import pandas as pd
# from statsmodels.nonparametric.kde import KDEUnivariate
from scipy.stats import wasserstein_distance
from scipy.spatial.distance import pdist, squareform
from sklearn.metrics.pairwise import pairwise_distances
from sklearn.decomposition import PCA
from sklearn.manifold import MDS
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import MinMaxScaler
from sklearn import metrics

# from .lamp import Lamp
import umap

def generate_stat(attributions, labels, columns, real_min, real_max, plain_labels):
	df = pd.DataFrame(columns=columns, data=attributions)
	stat_list = []
	for i in range(len(labels)):
		group = df.iloc[labels[i]]
		stat = kde(group, 0.1, real_min, real_max)
		stat_list.append(stat)
	# reconstruct for vis
	vis_stat = []
	feature_min = 1073741819
	feature_max = -1073741819
	for i in range(attributions.shape[1]):
		new_stat = {
			'name': columns[i],
			'distribution': [],
		}
		value_max = -1073741819
		attr_sum = 0
		for j in range(len(labels)):
			new_stat['group'+str(j)] = stat_list[j][i]['mean']
			attr_sum += new_stat['group'+str(j)]
			feature_min = min(feature_min, stat_list[j][i]['mean'])
			feature_max = max(feature_max, stat_list[j][i]['mean'])
			new_stat['distribution'].append(stat_list[j][i]['kde'])
			value_max = max(value_max, np.max(stat_list[j][i]['kde']))
		new_stat['kde_max'] = value_max
		new_stat['attr_sum'] = attr_sum

		new_stat['divergence'] = calculate_divergence(new_stat['distribution'])
		new_stat['weighted_var'] = calculate_variance(attributions[:, i], labels)
		vis_stat.append(new_stat)
	calcuate_feat_score(vis_stat)
	return vis_stat, [feature_min, feature_max]

def calculate_variance(vals, labels):
	score = 0
	for label in range(len(labels)):
		subp = np.var(vals[labels[label]])
		score += len(labels[label]) / np.sqrt(subp)
	return score

def calcuate_feat_score(vis_stat):
	# divergence = []
	in_cluster_variance = []
	inter_cluster_variance = []
	expl = []
	for i in range(len(vis_stat)):
		# divergence.append(vis_stat[i]['divergence'])
		in_cluster_variance.append(vis_stat[i]['weighted_var'])
		avg_vals = []
		abs_expl = []
		for j in range(len(vis_stat[i]['distribution'])):
			avg_vals.append(vis_stat[i]['group'+str(j)])
			abs_expl.append(np.abs(vis_stat[i]['group'+str(j)]))
		inter_cluster_variance.append(np.var(avg_vals))
		expl.append(np.max(abs_expl))
	'''remove infinity'''
	in_cluster_variance = np.array(in_cluster_variance)
	in_cluster_variance[in_cluster_variance > 1e10] = 0
	inter_cluster_variance = np.array(inter_cluster_variance)
	inter_cluster_variance[in_cluster_variance > 1e10] = 0

	'''scaling'''
	scaler = MinMaxScaler()

	in_variance = scaler.fit_transform(in_cluster_variance.reshape(len(in_cluster_variance),1))
	out_variance = scaler.fit_transform(inter_cluster_variance.reshape(len(inter_cluster_variance),1))
	expl_level = scaler.fit_transform(np.array(expl).reshape(len(expl),1))

	vis_score = (in_variance + out_variance + expl_level)/3
	for i in range(len(vis_stat)):
		vis_stat[i]['var_score'] = vis_score[i][0]


def generate_selected_stat(attributions, labels, columns, examples, general_stat, real_min, real_max):
	if (len(examples)==0):
		return []
	df = pd.DataFrame(columns=columns, data=attributions)
	stat_list = []
	for i in range(len(labels)):
		idx = np.intersect1d(examples, labels[i])
		group = df.iloc[idx]
		if (group.shape[0] > 0):
			stat_list.append({
				'mean': np.mean(group.values, axis=0) ,
			})
		else:
			stat_list.append({
				'mean': 0,
			})
		
	distribution = kde(df.iloc[examples], 0.1, real_min, real_max)

	# reconstruct for vis
	vis_stat = []
	attr_sum = 0
	for i in range(attributions.shape[1]):
		new_stat = {
			'distribution': distribution[i]['kde'],
		}
		for j in range(len(labels)):
			try:
				new_stat['group'+str(j)] = stat_list[j]['mean'][i]
				attr_sum += stat_list[j]['mean'][i]
			except:
				new_stat['group'+str(j)] = 'no'
		new_stat['attr_sum'] = attr_sum
		new_stat['divergence'] = general_stat[i]['divergence']
		vis_stat.append(new_stat)
	return vis_stat

def histogram(X, xmin, xmax):
	# values = np.zeros(len(pos))
	# minX = pos[0]
	# maxX = pos[-1]
	# if (step < 1e-10):
	# 	values[0] = len(X)
	# 	return values
	# for i in range(len(X)):
	# 	loc = int(np.floor((X[i] - minX) / step))
	# 	values[loc] += 1
	values = np.histogram(X, range=(xmin, xmax), density=True, bins=10)[0]
	values = values/len(X)
	return values

def kde(df, bandwidth, real_min, real_max):
	cols = df.columns
	sample_num = 10
	stat = []
	for col_id in range(len(cols)):
		col = cols[col_id]
		X = df[col].values
		# xmin = np.min(X)
		# xmax = np.max(X)
		mean = np.mean(X)
		pos = []
		# step = (xmax - xmin) / sample_num
		# for i in range(sample_num+1):
		# 	pos.append(xmin+i*step)

		# kde = KDEUnivariate(X)
		# kde.fit(bw=bandwidth)

		values = [0]
		values.extend(histogram(X,real_min[col_id],real_max[col_id]).tolist())
		# values.extend(kde.evaluate(pos).tolist())
		values.append(0)
		dstr_xmin = np.min(values)
		dstr_xmax = np.max(values)
#		 print(xmin, xmax, pos, values)
		stat.append({
			'dstr_min': dstr_xmin,
			'dstr_max': dstr_xmax,
			'mean': mean,
			'kde': values,
		})
	return stat

def calculate_divergence(distribution):
	d_distance = squareform(pdist(distribution,metric=wasserstein_distance))
	return np.sum(d_distance)

def get_medoid(distance, idx):
	dist_sum = distance.sum(axis=0)
	return idx[int(np.argmin(dist_sum))]

def get_cluster_medoid(distance, labels):
	centers = []
	for i in range(len(labels)):
		sub_distance = distance[labels[i]]
		sub_distance = sub_distance[:, labels[i]]
		centers.append(get_medoid(sub_distance, labels[i]))
	return centers

def add_group(centers, labels, distance, new_group):
	sub_distance = distance[new_group]
	sub_distance = sub_distance[:,new_group]
	new_labels = labels
	new_labels.append(new_group)
	dist_sum = sub_distance.sum(axis=0)
	new_centers = centers
	new_centers.append(new_group[int(np.argmin(dist_sum))])
	return new_centers, new_labels

def remove_group(centers, labels, to_del):
	val, cnt = np.unique(to_del, return_counts=True)
	real_del = []
	for i in range(len(val)):
		if cnt[i]%2==1:
			real_del.append(val[i])
	new_centers = np.delete(np.array(centers), real_del, 0)
	new_labels = np.delete(np.array(labels), real_del, 0)
	return len(real_del), list(new_centers), list(new_labels)

def process_attribution(attr):
	# attr = np.abs(np.array(attr))
	# col_sum = np.sum(attr, axis=1).reshape(attr.shape[0],1)
	# col_max = np.max(attr, axis=1).reshape(attr.shape[0],1)
	# attr = attr/col_max
	# return attr.tolist()

	attr = np.abs(np.array(attr))
	total = np.sum(np.abs(np.nan_to_num(attr)),axis=1)
	col_max = np.max(np.abs(np.nan_to_num(attr)),axis=1)
	output = np.abs(attr).transpose()*np.divide(1 ,col_max, out=np.zeros_like(col_max), where=col_max!=0)
	return output.transpose().tolist()

def reform_labels(plain_labels):
	plabels = np.array(plain_labels)
	if (len(plabels.shape)==2):
		labels = []
		return plain_labels, plabels.shape[0]
	elif (len(plabels.shape)==1):
		labels = []
		n_cluster = int(np.max(plain_labels) + 1)
		for i in range(n_cluster):
			idx = np.where(plain_labels==i)[0]
			labels.append(idx.tolist())
		return labels, n_cluster

def get_ctp(labels, X_normalized):
	cate_labels = np.unique(labels)
	classes = [np.where(labels == i)[0] for i in cate_labels]

	np.random.seed(20)
	contro_points_num = 50
	control_points_ids = []
	for c in classes:
		c_ids = np.random.randint(low=0,high=len(c),size=(contro_points_num,))
		control_points_ids.append(c_ids)

	y = labels
	Xctp = X_normalized[classes[0][control_points_ids[0]],:]
	yctp = y[classes[0][control_points_ids[0]]]
	idsctp = classes[0][control_points_ids[0]]
	for i in range(1,len(cate_labels)):
		Xctp = np.vstack((Xctp,X_normalized[classes[i][control_points_ids[i]],:]))
		yctp = np.hstack((yctp,y[classes[i][control_points_ids[i]]]))
		idsctp = np.hstack((idsctp,classes[i][control_points_ids[i]]))

	D_ctp = pairwise_distances(Xctp) #dist_between_ctr_points
	class_blocks = [(0,len(control_points_ids[0]))]
	for i in range(1,len(cate_labels)):
		class_blocks.append((class_blocks[-1][1],
							class_blocks[-1][1]+len(control_points_ids[i])))
	shrink_percentage = 0.9 ### cheat
	for c in class_blocks:
		D_ctp[c[0]:c[1],c[0]:c[1]] = D_ctp[c[0]:c[1],c[0]:c[1]]*(1.0 - shrink_percentage)
	return D_ctp, idsctp, class_blocks, Xctp


# def run_lamp(labels, X_normalized,):
	# print("Run Projection")
	# D_ctp, idsctp, class_blocks, Xctp = get_ctp(labels, X_normalized)
	# y = labels
	# MDS_obj = MDS(n_components=2,dissimilarity='precomputed')
	# MDS_Xctp_proj = MDS_obj.fit_transform(D_ctp)

	# eps = 1.0e-10
	# D_shrink_percentage = .8 ### cheat
	# D = pairwise_distances(X_normalized,Xctp,n_jobs=-1)
	# for i in range(X_normalized.shape[0]):
	# 	D[i,class_blocks[y[i]][0]:class_blocks[y[i]][1]] = \
	# 	D[i,class_blocks[y[i]][0]:class_blocks[y[i]][1]]*(1.0 - D_shrink_percentage) 

	# D = 1.0/(D**2+eps)
	# Xctp_lamp = np.hstack((MDS_Xctp_proj,idsctp.reshape(-1,1)))
	# lamp_obj = Lamp(Xdata = X_normalized, control_points=Xctp_lamp, weights=D, label=False, scale=False)
	# # print(X_normalized.shape, Xctp_lamp.shape)
	# lamp_proj = lamp_obj.fit()
	# return lamp_proj

def run_LOF(X_normalized):
	print("Run Outlier Detection")
	clf = LocalOutlierFactor(n_neighbors=2,contamination=0.01)
	outlier_labels = clf.fit_predict(X_normalized)
	return outlier_labels

def run_clustering(cluster_obj, attributions):
	print("Run Clustering")
	X_normalized = PCA(n_components=5).fit_transform(np.array(attributions))
	cluster_obj.fit(X_normalized)
	return cluster_obj.labels_.astype(np.int)

def run_projection(attributions):
	print("Run Projection")
	trans = umap.UMAP(n_neighbors=10, random_state=42).fit(attributions)
	return trans.embedding_
	# embedding = PCA(n_components=2).fit_transform(np.array(attributions))
	# return embedding

'''map the feature names to indices'''
def derive_feat_weight(columns, selected_feat_names, alpha, stat):
	weight = np.ones(shape=len(columns)) * (1-alpha)
	for col in selected_feat_names:
		try:
			index = columns.index(col)
			weight[index] = alpha
		except ValueError:
			continue
	return weight
	
