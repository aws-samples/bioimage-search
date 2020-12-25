#  BACKGROUND
# 
# This script creates lists of train/label artifacts suitable for training the BBBC021 dataset
#.  https://bbbc.broadinstitute.org/BBBC021
# 
# To demonstrate prediction of mechanisn of action (MOA), a separate training set is created for each compound of known MOA, such
# that the remaining labeled compounds can be used to train a classifier, which in turn can attempt to successfully classify the
# left out compound.
#
# Once the classifier is trained, there are two 'best-matching' methods:
#
#   NSC - not same compound - only considers matches to other compounds
#   NSCB - not same compound or batch - excludes both same compound and batch before best-match
#
# In addition to NSC vs NSCB for matching, there are two different scoring methods:
#
#   Per Treatment - averages embeddings across all wells for a given treatment
#.  Per Well - averages embeddings only within wells
#
# USAGE
#
# This script is run after all plate imagery is loaded into bioimage search.
#
# It requires as input an 'embeddingName' which is used to identify the particular dataset of interest for training, in terms of its image processing 
# and training parameters. Different trainIds within the context of an embedding correspond to different training runs with different partitions of
# training data, but they do not vary in structural parameters for image processing or training.
#
# We first use utilities to get BBBC-021 metadata that identifies the compound and moa for every plate, well, and image.
#
# Our output will consist of a separate image artifact list per compound with a known MOA, with that compound being left out. Although the 
# dataset has 113 compounds, only a subset of these have known MOAs and therefore can be used.
# 
# Our general plan is to:
#
#  1 - Load BBBC-021 metadata
#. 2 - Create a map of lists, the keys for which corresponds to each compound with known moa. The list will be a list of objects, each of which will
#.       contain sufficient info to specify the training artifacts, namely, { plateId, imageId } - we also need embeddingName but that is global context.
#  3 - Get the list of plateIds compatible with the specified embedding
#. 4 - Iterate through the list of compatible plateIds
#. 5 - For each plateId, iterate through its member images
#  6 - For each member image, iterate over each moa-compound
#  7 - For each moa-compound, only include the image if two conditions are met:
#        (a) - the image has a known moa
#        (b) - the compound applied in the image is not the moa-compound itself
#  8 - Once all lists are populated, write files locally for each list, in tuples for { train, label }
#
###############################################################################################

import sys
import bbbc021common as bb

sys.path.insert(0, "../../../cli/bioims/src")
import bioims

BBBC021_BUCKET = 'bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127'
EMBEDDING = "bbbc021"

image_df, moa_df = bb.Bbbc021PlateInfoByDF.getDataFrames(BBBC021_BUCKET)
compound_moa_map = bb.Bbbc021PlateInfoByDF.getCompoundMoaMapFromDf(moa_df)

bbbc021ImageCount = len(image_df.index)

print("BBBC-021 image count={}".format(bbbc021ImageCount))

compoundRemoved={}
