import sys
sys.path.insert(0, "../src")
import bioims

configurationClient = bioims.client('configuration')

configurationClient.setParameter("default-image-artifact-sizes", "100,1000")
configurationClient.setParameter("default-image-artifact-keys", "thumbnail-2d.png,medium-2d.png")
configurationClient.setParameter("image-preprocessing-roi-size", "128")
configurationClient.setParameter("image-preprocessing-min-voxels", "200")
