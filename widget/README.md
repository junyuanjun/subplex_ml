subplex_ml
===============================

A Jupyter extension for subpopulation-level insepction of local model explanations

Installation
------------

To install use pip (not published yet):

    $ pip install subplex_ml

For a development installation (requires [Node.js](https://nodejs.org) and [Yarn version 1](https://classic.yarnpkg.com/)), you need to first install the required packages.

    $ pip install -r requirements.txt

for Jupyter Notebook

```
$ jupyter nbextension install --py --symlink --overwrite --sys-prefix subplex_ml
$ jupyter nbextension enable --py --sys-prefix subplex_ml
```

for JupyterLab, run the command:

    $ jupyter labextension develop --overwrite subplex_ml

You then need to refresh the JupyterLab page when your javascript changes.
