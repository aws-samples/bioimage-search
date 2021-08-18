import sys
import json
import boto3
sys.path.insert(0, "../src")
import bioims

# Moa list from https://bbbc.broadinstitute.org/BBBC021

# Moa = mechanism of action
bbbc021Category = 'moa'
bbbc021Subclass = 'compound'

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

labelClient.createLabel(bbbc021Subclass, 'DMSO')
labelClient.createLabel(bbbc021Subclass, 'ALLN')
labelClient.createLabel(bbbc021Subclass, 'AZ-A')
labelClient.createLabel(bbbc021Subclass, 'AZ-C')
labelClient.createLabel(bbbc021Subclass, 'AZ-J')
labelClient.createLabel(bbbc021Subclass, 'AZ-U')
labelClient.createLabel(bbbc021Subclass, 'AZ138')
labelClient.createLabel(bbbc021Subclass, 'AZ258')
labelClient.createLabel(bbbc021Subclass, 'AZ841')
labelClient.createLabel(bbbc021Subclass, 'MG-132')
labelClient.createLabel(bbbc021Subclass, 'PD-169316')
labelClient.createLabel(bbbc021Subclass, 'PP-2')
labelClient.createLabel(bbbc021Subclass, 'alsterpaullone')
labelClient.createLabel(bbbc021Subclass, 'anisomycin')
labelClient.createLabel(bbbc021Subclass, 'bryostatin')
labelClient.createLabel(bbbc021Subclass, 'camptothecin')
labelClient.createLabel(bbbc021Subclass, 'chlorambucil')
labelClient.createLabel(bbbc021Subclass, 'cisplatin')
labelClient.createLabel(bbbc021Subclass, 'colchicine')
labelClient.createLabel(bbbc021Subclass, 'cyclohexamide')
labelClient.createLabel(bbbc021Subclass, 'cytochalasinB')
labelClient.createLabel(bbbc021Subclass, 'cytochalasinD')
labelClient.createLabel(bbbc021Subclass, 'demecolcine')
labelClient.createLabel(bbbc021Subclass, 'docetaxel')
labelClient.createLabel(bbbc021Subclass, 'emetine')
labelClient.createLabel(bbbc021Subclass, 'epothiloneB')
labelClient.createLabel(bbbc021Subclass, 'etoposide')
labelClient.createLabel(bbbc021Subclass, 'floxuridine')
labelClient.createLabel(bbbc021Subclass, 'lactacystin')
labelClient.createLabel(bbbc021Subclass, 'latrunculinB')
labelClient.createLabel(bbbc021Subclass, 'methotrexate')
labelClient.createLabel(bbbc021Subclass, 'mevinolin-lovastatin')
labelClient.createLabel(bbbc021Subclass, 'mitomycinC')
labelClient.createLabel(bbbc021Subclass, 'mitoxantrone')
labelClient.createLabel(bbbc021Subclass, 'nocodazole')
labelClient.createLabel(bbbc021Subclass, 'proteasomeinhibitorI')
labelClient.createLabel(bbbc021Subclass, 'simvastatin')
labelClient.createLabel(bbbc021Subclass, 'taxol')
labelClient.createLabel(bbbc021Subclass, 'vincristine')
