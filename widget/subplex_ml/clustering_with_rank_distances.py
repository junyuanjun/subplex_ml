from pyclustering.cluster.kmedoids import kmedoids
from scipy.spatial.distance import pdist, squareform
import numpy as np
import random

def ktau_distance(r_1, r_2, w, ranked = False):
    """
    Computes a kendall tau distance.
    Returns: integer >= 0 representing the distance between the rankings
    """
    # confirm r_1 and r_2 have same lengths
    if len(r_1) != len(r_2):
        raise ValueError("rankings must contain the same number of elements")
    if not ranked:
        r_1 = np.argsort(-r_1, axis=1)
        r_2 = np.argsort(-r_2, axis=1)
        
    i,j = np.triu_indices(len(r_1),k=1)
    _w = w[i]*w[j]
    return (1/ np.sum(_w)) * np.sum(_w*np.sign(r_1[i] - r_1[j])  * np.sign(r_2[i] - r_2[j]))


def pairwise_ktau_distance_matrix(rankings,ranked=False,w=None):
    """
    Computes a matrix of pairwise distance
    Args:
        rankings (list): each element is a list of weighted rankings (see ktau_weighted_distance)
    Returns: matrix (list of lists) containing pairwise distances
    """
    if not ranked:
        rankings = np.argsort(-rankings, axis=1)
    if w is None:
        w = np.ones(rankings.shape[1])
    def _dist(r_1,r_2):
        return ktau_distance(r_1,r_2,w,ranked=True)
    return squareform(pdist(rankings,metric=_dist))

def spearman_squared_distance(r_1, r_2,w,ranked=False):
    """
    Computes a Spearman's Rho squared distance. Runs in O(n)

    Returns: float >= representing the distance between the rankings
    """
    # confirm r_1 and r_2 have same lengths
    if len(r_1) != len(r_2):
        raise ValueError("rankings must contain the same number of elements")
        
    if not ranked:
        r_1 = np.argsort(-r_1, axis=1)
        r_2 = np.argsort(-r_2, axis=1)
    return np.sum(w * np.square(r_1 - r_2))

def pairwise_spearman_distance_matrix(rankings,ranked=False,w=None):
    """
    Computes a matrix of pairwise distance

    Args:
        rankings (list): each element is a list of weighted rankings (see ktau_weighted_distance)

    Returns: matrix (list of lists) containing pairwise distances
    """
    if not ranked:
        rankings = np.argsort(-rankings, axis=1)
    if w is None:
        w = np.ones(rankings.shape[1])
    def _dist(r_1,r_2):
        return spearman_squared_distance(r_1,r_2,w,ranked=True)
    return squareform(pdist(rankings,metric=_dist))

def kMedoidClustering(dist,k=3):
    N =dist.shape[0]
    initial_medoids = random.sample(range(0, N), k)
    kmedoids_instance = kmedoids(dist, initial_medoids, data_type='distance_matrix',itermax=100000)
    kmedoids_instance.process()
    centers = kmedoids_instance.get_medoids()
    labels = kmedoids_instance.get_clusters()
    return centers, labels