import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

# Moa list from https://bbbc.broadinstitute.org/BBBC021

# Moa = mechanism of action
bbbc021Category = 'moa'

labelClient = bioims.client('label')

labelClient.createCategory(bbbc021Category, 'BBBC021 Dataset Labels')

labelClient.createLabel(bbbc021Category, 'Actin disruptors')
labelClient.createLabel(bbbc021Category, 'Aurora kinase inhibitors')
labelClient.createLabel(bbbc021Category, 'Cholesterol-lowering')
labelClient.createLabel(bbbc021Category, 'DMSO')
labelClient.createLabel(bbbc021Category, 'DNA damage')
labelClient.createLabel(bbbc021Category, 'DNA replication')
labelClient.createLabel(bbbc021Category, 'Eg5 inhibitors')
labelClient.createLabel(bbbc021Category, 'Epithelial')
labelClient.createLabel(bbbc021Category, 'Kinase inhibitors')
labelClient.createLabel(bbbc021Category, 'Microtubule destabilizers')
labelClient.createLabel(bbbc021Category, 'Microtubule stabilizers')
labelClient.createLabel(bbbc021Category, 'Protein degradation')
labelClient.createLabel(bbbc021Category, 'Protein synthesis')
