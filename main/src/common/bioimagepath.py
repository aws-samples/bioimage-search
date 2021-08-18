def getTrainPrefixKey(embeddingName, plateId, imageId):
    return "artifact/train/embedding/" + embeddingName + "/plate/" + plateId + "/image-" + imageId 
    
def getTrainKey(embeddingName, plateId, imageId):
    prefix = getTrainPrefixKey(embeddingName, plateId, imageId)
    return prefix + "-train.npy"
    
def getLabelKey(embeddingName, plateId, imageId):
    prefix = getTrainPrefixKey(embeddingName, plateId, imageId)
    return prefix + "-label.npy"

def getNoLabelKey(embeddingName, plateId, imageId):
    prefix = getTrainPrefixKey(embeddingName, plateId, imageId)
    return prefix + "-label.NONE"

def getSubclassKey(embeddingName, plateId, imageId):
    prefix = getTrainPrefixKey(embeddingName, plateId, imageId)
    return prefix + "-subclass.npy"

def getRoiKey(embeddingName, plateId, imageId):
    prefix = getTrainPrefixKey(embeddingName, plateId, imageId)
    return prefix + "-roi.json"
    
def getTrainImageListArtifactPath(trainId):
    return "artifact/train/" + trainId + "/" + trainId + "-image-prefix-list.txt"
    
def getRoiEmbeddingKey(imageId, plateId, trainId):
    return "artifact/train/" + trainId + "/plate/" + plateId + "/" + imageId + "-roi-embedding.npy"
    
def getFlatFieldKeyForChannel(plateId, embeddingName, channelName):
    flatFieldKey = "artifact/plate/" + plateId + "/" + embeddingName + "/channel-" + channelName + "-flatfield.npy"
    return flatFieldKey

