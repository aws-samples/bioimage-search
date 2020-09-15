import sys
import json
from random import seed
from random import randint
import boto3
sys.path.insert(0, "../src")
import bioims

messageClient = bioims.client('message')

seed(1)

mids=[]

for i in range(10):
    r = messageClient.createMessage("message test "+str(i))
    mids.append(r)

for i in range(10):
    r = messageClient.getMessage(mids[i])
    print(r)

for i in range(10):
    print(i)
    print(mids[i])
    r = messageClient.addMessage(mids[i], "message test add3 "+str(i))
    print(r)

for i in range(10):
    print(i)
    print(mids[i])
    r = messageClient.addMessage(mids[i], "message test add4 "+str(i))
    print(r)
    
for i in range(10):
    r = messageClient.listMessage(mids[i])
    print(r)

for i in range(10):
    messageClient.deleteMessage(mids[i])

