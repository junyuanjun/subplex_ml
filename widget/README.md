subplex_ml
===============================

A Jupyter extension for subpopulation-level insepction of local model explanations

Installation
------------

To install use pip (not published yet):

    $ pip install subplex_ml

For a development installation (requires [Node.js](https://nodejs.org) and [Yarn version 1](https://classic.yarnpkg.com/)).

If you do not have them, you can install them by running

```
$ conda install -c conda-forge nodejs
$ conda update nodejs
$ conda install -c conda-forge yarn
```

[optional] You can create a virtual environment for this widget by running

```
conda create -n jupyterlab-ext --override-channels --strict-channel-priority -c conda-forge -c nodefaults jupyterlab=3 cookiecutter nodejs jupyter-packaging git
```

You need to first install the required packages.

    $ pip install -r requirements.txt

Then you can install the widget. 

For Jupyter Notebook:

```
$ jupyter nbextension install --py --symlink --overwrite --sys-prefix subplex_ml
$ jupyter nbextension enable --py --sys-prefix subplex_ml
```

For JupyterLab, run the command:

    $ jupyter labextension develop --overwrite subplex_ml

You then need to refresh the JupyterLab page when your javascript changes.
