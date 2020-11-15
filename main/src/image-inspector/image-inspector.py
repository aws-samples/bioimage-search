import bioimageimage as bi

"""

It inspects the image (including all channel files, if separate) and returns the dimensions.

Example input event:

event= {'Item': 
        {   'trainCategory': 'moa', 
            'imageId': 'rEhXPhQ141NMoyUk6GQpc5', 
            'plateId': '3YpbgZCfkNLfZHDTZU3E2x', 
            'trainId': 'origin', 
            'plateSourceId': 'Week1_22123', 
            'bucket': 'bioimagesearchbbbc021stack-bbbc021bucket544c3e64-10ecnwo51127', 
            'experiment': 'BBBC021_v1', 
            'channelKeys': [{'name': 'dapi', 'keysuffix': 'Week1_22123/Week1_150607_D10_s3_w172448BEF-3248-4414-81F8-062AD4A8A945.tif'}, 
                            {'name': 'tubulin', 'keysuffix': 'Week1_22123/Week1_150607_D10_s3_w26491D8F9-CF81-4D24-A7FB-7F2DDCC84044.tif'}, 
                            {'name': 'actin', 'keysuffix': 'Week1_22123/Week1_150607_D10_s3_w4EB8A365E-DF1E-49E9-8E14-9F11B5665718.tif'}], 
            'wellId': 'hrQh9M7BLLu2odRM2uYWYy', 
            'imageSourceId': 'Week1_150607_D10_s3_w172448BEF-3248-4414-81F8-062AD4A8A945', 
            'messageId': 'c30b9ed2-330f-484e-a828-a74e9bce3480', 
            'wellSourceId': 'D10', 
            'trainLabel': 'Microtubule stabilizers', 
            'key': '', 
            'createTimestamp': '1604622079504'}}

response = {
            imageId : <imageId>,
            valid: true, false,
            width: <width>,
            height: <height>,
            depth: <depth>,
            channels: <channels>
        }
            
}

"""

def passZeroCheck(np):
    shape=np.shape
    if len(shape) > 1 and shape[-1] > 0 and shape[-2] > 0:
        return True
    else:
        return False
        
def getDimensions(np):
    depth=1
    if len(np.shape) > 2:
        depth = np.shape[-3]
    return (np.shape[-1], np.shape[-2], depth)
    

def handler(event, context):
    item = event['Item']
    imageId = item['imageId']
    bucket = item['bucket']
    key = item['key']
    numChannels=0
    if 'channelKeys' in item:
        numChannels=len(item['channelKeys'])
    imageKeys = []
    if numChannels==0:
        imageKeys.append(key)
    else:
        channelKeys=item['channelKeys']
        for channelKey in channelKeys:
            imageKeys.append(key + channelKey['keysuffix'])
    if numChannels==0:
        try:
            np=bi.getImageFromS3AsNumpy(bucket,imageKeys[0])
        except Exception as err:
            errStr = "exception={0}".format(err)
            print("Error loading bucket="+bucket+" key="+imageKeys[0]+" "+errStr)
            return { "imageId" : imageId, "valid" : False, "width": -1, "height" : -1, "depth" : -1, "channels" : -1 }
        if passZeroCheck(np):
            dims = getDimensions(np)
            return { "imageId" : imageId, "valid" : True, "width": dims[0], "height": dims[1], "depth": dims[2], "channels": 1 }
    else:
        dims=[]
        for i, channel in enumerate(item['channelKeys']):
            try:
                np=bi.getImageFromS3AsNumpy(bucket, imageKeys[i])
            except Exception as err:
                errStr = "exception={0}".format(err)
                print("Error loading bucket="+bucket+ " key="+imageKeys[i]+" "+errStr)
                return { "imageId" : imageId, "valid" : False, "width": -1, "height" : -1, "depth" : -1, "channels" : -1 }
            ndims = getDimensions(np)
            if i==0:
                dims.append(ndims[0])
                dims.append(ndims[1])
                dims.append(ndims[2])
            else:
                if not(dims[0]==ndims[0] and dims[1]==dims[1] and dims[2]==dims[2]):
                    print("Error dimensions do not match for channel  bucket="+bucket+ " key="+imageKeys[i])
                    return { "imageId" : imageId, "valid" : False, "width": -1, "height" : -1, "depth" : -1, "channels" : -1 }
        result = { "imageId" : imageId, "valid" : True, "width" : dims[0], "height" : dims[1], "depth" : dims[2], "channels" : numChannels }
        # DEBUG
        print(result)
        return result
