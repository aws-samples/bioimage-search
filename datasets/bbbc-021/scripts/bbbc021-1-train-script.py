import argparse
import logging
import torch
import torchvision
import torchvision.transforms as transforms
import numpy as np
import os as os
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
import random
from collections import defaultdict
from PIL import Image
import json

import torch.distributed as dist
import torch.nn.parallel
import torch.optim
import torch.utils.data
import torch.utils.data.distributed


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

num_classes = 13
minibatches = 100000
channels = 3
height_width = 128

class Net(nn.Module): 
    def __init__(self):
        super(Net, self).__init__()
        self.conv1 = nn.Conv2d(channels, 32, 3, stride=2)
        self.conv2 = nn.Conv2d(32, 64, 3, stride=2)
        self.conv3 = nn.Conv2d(64, 128, 3, stride=2)
        self.dc3 = nn.Dropout2d(0.05)
        self.conv4 = nn.Conv2d(128, 256, 3, stride=2)
        self.dc4 = nn.Dropout2d(0.05)
        self.conv5 = nn.Conv2d(256, 512, 3, stride=2)
        self.dc5 = nn.Dropout2d(0.05)
        self.conv6 = nn.Conv2d(512, 2048, 3, stride=2)
        self.dc6 = nn.Dropout2d(0.10)
        self.fc1 = nn.Linear(2048, 1024)
        self.d1 = nn.Dropout(0.2)
        self.fc2 = nn.Linear(1024, 256)

    def forward(self, x):
        x = self.conv1(x)
        x = F.relu(x)
        x = self.conv2(x)
        x = F.relu(x)
        x = self.conv3(x)
        x = F.relu(x)
        x = self.dc3(x)
        x = self.conv4(x)
        x = F.relu(x)
        x = self.dc4(x)
        x = self.conv5(x)
        x = F.relu(x)
        x = self.dc5(x)
        x = self.conv6(x)
        x = F.relu(x)
        x = self.dc6(x)
        x = x.view(-1, 2048)
        x = self.fc1(x)
        x = F.relu(x)
        x = self.d1(x)
        x = self.fc2(x)
        n = x.norm(p=2, dim=1, keepdim=True)
        x = x.div(n)
        return x
        
def load_training_data(prefixListPath):
    sm_channel_prefix = os.environ['SM_CHANNEL_TRAINING'] + "/"
    os.chdir(sm_channel_prefix)
    path = os.getcwd()
    print("cwd path=")
    print(path)
    print("==")
    files = os.listdir('.')
    for f in files:
        print(f)
    print("==")
    prefixListPath = sm_channel_prefix + prefixListPath
    f = open(prefixListPath, "r")
    trainPathList = []
    labelPathList = []
    subclassPathList = []
    x_list = []
    y_list = []
    z_list = []
    
    for prefix in f:
        rprefix = prefix.rstrip()
        trainPath = sm_channel_prefix + rprefix + "-train.npy"
        labelPath = sm_channel_prefix + rprefix + "-label.npy"
        subclassPath = sm_channel_prefix + rprefix + '-subclass.npy'
        trainPathList.append(trainPath)
        labelPathList.append(labelPath)
        subclassPathList.append(subclassPath)
    f.close()
    
    pathListLength = len(trainPathList)
    print("Prefix path list has {} entries".format(pathListLength))
    
    for labelPath in labelPathList:
        print("Loading {}".format(labelPath))
        y_list.append(np.load(labelPath))
    print("Concatenating...")
    y_train = np.concatenate(y_list, axis=0)
    trainCount=y_train.shape[0]
    print("Label count={}".format(trainCount))

    for subclassPath in subclassPathList:
        print("Loading {}".format(subclassPath))
        z_list.append(np.load(subclassPath))
    print("Concatenating...")
    z_train = np.concatenate(z_list, axis=0)
    subclassCount=z_train.shape[0]
    print("Subclass count={}".format(subclassCount))

    ##########################################################################
    # Todo: create dynamic sizing model based on input dimensions.
    # This script assumes input with 4 dimensions. It assumes 2D rather then 3D data, with 3 channels:
    #    image#, channels, y, x 
    #  
    # With channels=3, x and y = 128
    #
    # However, input is 3D and will be <#>, 3, 1, 128, 128
    #
    ##########################################################################
    trainDimArr = [ trainCount, 3, 128, 128 ]
    trainDimTuple = tuple(trainDimArr)
    x_train = np.zeros(trainDimTuple, dtype=np.uint16)
    tIndex=0
    lc=0
    for trainPath in trainPathList:
        if lc%10==0:
            print("Loaded {} of {} train files".format(lc, pathListLength))
        print("Loading {}".format(trainPath))
        x_data = np.load(trainPath)
        xLength = x_data.shape[0]
        for di in range(xLength):
            x_train[tIndex][0]=x_data[di][0][0]
            x_train[tIndex][1]=x_data[di][1][0]
            x_train[tIndex][2]=x_data[di][2][0]
            tIndex+=1
        lc+=1

    x_shape = x_train.shape
    y_shape = y_train.shape
    z_shape = z_train.shape
    print("x_shape=")
    print(x_shape)
    print("==")
    print("y_shape=")
    print(y_shape)
    print("==")
    print("z_shape=")
    print(z_shape)
    print("==")
    return x_train, y_train, z_train

def _train(args):
    
    epochs = args.epochs
    startingEpoch=0
    
    torch.manual_seed(args.seed)

    # NOTE: For Horovod, use: https://github.com/awslabs/amazon-sagemaker-examples/blob/master/sagemaker-python-sdk/pytorch_horovod_mnist/code/mnist.py
    is_distributed = len(args.hosts) > 1 and args.backend is not None
    logger.debug("Distributed training - {}".format(is_distributed))

    if is_distributed:
        # Initialize the distributed environment.
        world_size = len(args.hosts)
        os.environ['WORLD_SIZE'] = str(world_size)
        host_rank = args.hosts.index(args.current_host)
        #os.environ['RANK'] = str(host_rank)
        dist.init_process_group(backend=args.backend, rank=host_rank, world_size=world_size)
        logger.info(
            'Initialized the distributed environment: \'{}\' backend on {} nodes. '.format(
                args.backend,
                dist.get_world_size()) + 'Current host rank is {}. Using cuda: {}. Number of gpus: {}'.format(
                dist.get_rank(), torch.cuda.is_available(), args.num_gpus))

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logger.info("Device Type: {}".format(device))
    
    x_train, y_train, z_train = load_training_data(args.train_list_file)

    x_train = x_train.reshape(-1, channels, height_width, height_width)
    
    xts = x_train.shape
    print("x_train reshape=")
    print(xts)
    print("==")
    
    if y_train.shape[0] != z_train.shape[0]:
        print("Error - y_train and z_train must have same length")
        return
    
    classDict = defaultdict(lambda: defaultdict(list))
    for i in range(y_train.shape[0]):
        y = y_train[i]
        z = z_train[i]
        classDict[y][z].append(i)
        
    for ck, cv in classDict.items():
        for sk, sv in cv.items():
            sl = len(sv)
            print("Class {} Subclass {} has {} members".format(ck, sk, sl))
        
    class AnchorPositivePairs():
        def __init__(self):
            self.num_batches = 1

        def __len__(self):
            return self.num_batches

        def getitem(self):
            x = np.empty((2, num_classes, channels, height_width, height_width), dtype=np.float32)
            for class_idx in range(num_classes):
                subclasses_for_class = classDict[class_idx]
                slist = list(subclasses_for_class.values())
                anchor_subclass_list = random.choice(slist)
                positive_subclass_list = random.choice(slist)
                anchor_idx = random.choice(anchor_subclass_list)
                positive_idx = random.choice(positive_subclass_list)
                while positive_idx == anchor_idx:
                    positive_idx = random.choice(positive_subclass_list)
                x[0, class_idx] = (x_train[anchor_idx].astype(np.float32))/65535.0
                x[1, class_idx] = (x_train[positive_idx].astype(np.float32))/65535.0
            
            return torch.tensor(x)

    pairGenerator=AnchorPositivePairs()
    
    checkpointModelPath = os.path.join("/opt/ml/checkpoints", 'model.pth')
    if (os.path.exists(checkpointModelPath)):
        print("Reading checkpoint model")
        model = model_fn("/opt/ml/checkpoints")
        checkpointEpochPath = os.path.join("/opt/ml/checkpoints", "epoch.txt")
        if (os.path.exists(checkpointEpochPath)):
            with open(checkpointEpochPath, "r") as text_file:
                epochStr=text_file.read()
                startingEpoch = int(epochStr)
                print("Resuming beginning with epoch {}".format(startingEpoch))

    else:
        print("No checkpoint model found")
        model = Net()

    if torch.cuda.device_count() > 1:
        logger.info("Gpu count: {}".format(torch.cuda.device_count()))
        model = nn.DataParallel(model)

    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.SGD(model.parameters(), lr=0.001, momentum=0.9)

    sparse_labels = torch.zeros(num_classes, dtype=torch.long)
    for l in range(num_classes):
        c = l%num_classes
        sparse_labels[l] = c
    
    sparse_labels = sparse_labels.to(device)

    best_loss = -1.0
    best_epoch = 0
    for epoch in range(startingEpoch, args.epochs):
    
        i=0
        running_loss = 0.0
        epoch_loss = 0.0
        for minibatch in range(minibatches):

            data = pairGenerator.getitem()

            anchors, positives = data[0].to(device), data[1].to(device)
            #anchors, positives = data[0], data[1]
            
            optimizer.zero_grad()
                        
            anchor_embeddings = model(anchors)     
            
            positive_embeddings = model(positives)

            similarities = torch.einsum(
                "ae,pe->ap", anchor_embeddings, positive_embeddings
            )
            
            # Since we intend to use these as logits we scale them by a temperature.
            # This value would normally be chosen as a hyper parameter.
            temperature = 0.2
            similarities /= temperature
            
            # We use these similarities as logits for a softmax. The labels for
            # this call are just the sequence [0, 1, 2, ..., num_classes] since we
            # want the main diagonal values, which correspond to the anchor/positive
            # pairs, to be high. This loss will move embeddings for the
            # anchor/positive pairs together and move all other pairs apart.

            # For CrossEntropyLoss
            loss = criterion(similarities, sparse_labels)
            
            # For CosineEmbeddingLoss
            #loss = criterion(anchor_embeddings, positive_embeddings, y)
            
            loss.backward()
            optimizer.step()

            # print statistics
            item_loss = loss.item()
            running_loss += item_loss
            epoch_loss += item_loss
            if i==0:
                be1 = best_epoch+1
                print("Best epoch={}".format(be1))
            if i % 200 == 199:    
                print('v2 [%d, %5d] loss: %.6f' %
                      (epoch + 1, i + 1, running_loss / 200))
                running_loss = 0.0
            i+=1
        
        if best_loss < 0.0 or epoch_loss < best_loss:
            print("Best loss={} Epoch loss={}".format(best_loss, epoch_loss))
            print("Saving checkpoint to ", args.model_dir)
            nextEpoch=epoch+1
            _save_model(model, args.model_dir, nextEpoch)
            best_loss = epoch_loss
            best_epoch = epoch
        else:
            print("Stopping due to lack of improvement in prior epoch")
            break
            
        model = model.to(device)

    print('Finished Training')
    #return _save_model(model, args.model_dir)

    
def _save_model(model, model_dir, epoch):
    logger.info("Saving the model.")
    path = os.path.join(model_dir, 'model.pth')
    checkpoint_path = os.path.join("/opt/ml/checkpoints", 'model.pth')
    # recommended way from http://pytorch.org/docs/master/notes/serialization.html
    torch.save(model.cpu().state_dict(), path)
    torch.save(model.cpu().state_dict(), checkpoint_path)
    
    checkpointEpochPath = os.path.join("/opt/ml/checkpoints", "epoch.txt")
    with open(checkpointEpochPath, "w") as text_file:
        text_file.write(str(epoch))

def model_fn(model_dir):
    logger.info('model_fn')
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = Net()
    if torch.cuda.device_count() > 1:
        logger.info("Gpu count: {}".format(torch.cuda.device_count()))
        model = nn.DataParallel(model)

    with open(os.path.join(model_dir, 'model.pth'), 'rb') as f:
        model.load_state_dict(torch.load(f))
    return model.to(device)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    
    parser.add_argument('--train_list_file', type=str, default='', help='path to file containing list of path prefixes for training')

    parser.add_argument('--workers', type=int, default=2, metavar='W',
                        help='number of data loading workers (default: 2)')
    parser.add_argument('--epochs', type=int, default=2, metavar='E',
                        help='number of total epochs to run (default: 2)')
    parser.add_argument('--batch_size', type=int, default=4, metavar='BS',
                        help='batch size (default: 4)')
    parser.add_argument('--lr', type=float, default=0.001, metavar='LR',
                        help='initial learning rate (default: 0.001)')
    parser.add_argument('--momentum', type=float, default=0.9, metavar='M', help='momentum (default: 0.9)')
    parser.add_argument('--backend', type=str, default='gloo', help='distributed backend (default: gloo)')
    parser.add_argument('--seed', type=int, default=42, metavar='S',
                        help='random seed (default: 42)')

    parser.add_argument('--train', type=str, default=os.environ.get('SM_CHANNEL_TRAINING'))
    parser.add_argument('--hosts', type=list, default=json.loads(os.environ['SM_HOSTS']))
    parser.add_argument('--current-host', type=str, default=os.environ['SM_CURRENT_HOST'])
    parser.add_argument('--model-dir', type=str, default=os.environ['SM_MODEL_DIR'])
    parser.add_argument('--data-dir', type=str, default=os.environ['SM_CHANNEL_TRAINING'])
    parser.add_argument('--num-gpus', type=int, default=os.environ['SM_NUM_GPUS'])

    _train(parser.parse_args())
