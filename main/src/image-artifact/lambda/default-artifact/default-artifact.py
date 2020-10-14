import math
import os
from io import StringIO, BytesIO
import boto3
from PIL import Image
import numpy as np
from skimage.exposure import histogram

# seaborn color_palette("husl", 100)
colors =[(0.9677975592919913, 0.44127456009157356, 0.5358103155058701),
 (0.9682939613341975, 0.4449521541037412, 0.502681554961979),
 (0.9688001471602651, 0.4486661677799257, 0.4657645051942268),
 (0.9693205304597124, 0.4524474384122417, 0.4235093533325958),
 (0.9698600079214633, 0.4563290467075703, 0.37329452564779764),
 (0.9704241569984234, 0.4603475375001678, 0.3099359864545268),
 (0.9710194877714075, 0.4645444048369612, 0.21958695134807432),
 (0.9432571175715949, 0.4858297337787321, 0.19627813712865805),
 (0.9129194632825568, 0.5061236158165039, 0.1959743146264521),
 (0.8859561388376408, 0.5226505841897353, 0.1957148314100009),
 (0.8616090647292522, 0.536495730113334, 0.19548899031476086),
 (0.8393135149096066, 0.5483638183015401, 0.1952891752212395),
 (0.8186364435696062, 0.5587352208931429, 0.19510980216421525),
 (0.7992366176517394, 0.5679502874482604, 0.19494666966116514),
 (0.7808378773693458, 0.5762580853785418, 0.19479654118379955),
 (0.7632105624545804, 0.5838460616396939, 0.19465686802007023),
 (0.7461581399425343, 0.5908588842337321, 0.19452559991106833),
 (0.729507186466474, 0.5974108553650256, 0.19440105212898393),
 (0.7130995200796869, 0.603594357208924, 0.19428180969567224),
 (0.6967856488918167, 0.6094857716505745, 0.1941666564766089),
 (0.6804189127793346, 0.6151497514677574, 0.19405452111445337),
 (0.6638497942669026, 0.6206423963955671, 0.193944434364614),
 (0.6469198885248283, 0.6260136954691768, 0.1938354940106293),
 (0.6294549504383264, 0.6313094806780026, 0.19372683453729503),
 (0.6112562547547398, 0.6365730658187477, 0.1936175993332644),
 (0.5920891529639701, 0.6418467016378244, 0.1935069134991043),
 (0.5716670596102353, 0.6471729545545385, 0.1933938554082785),
 (0.5496278799062962, 0.652596106555733, 0.19327742502069384),
 (0.5254974984747257, 0.6581636763063526, 0.1931565065536415),
 (0.49862995317502606, 0.6639281765667906, 0.19302982239856423),
 (0.46810256823426116, 0.6699492535792404, 0.19289587399044988),
 (0.43251552772443846, 0.6762964064441414, 0.19275286343588344),
 (0.3895605218334725, 0.6830525701397582, 0.19259858664036306),
 (0.3349123067396974, 0.6903189852056115, 0.19243028365232387),
 (0.2583652459502072, 0.6982220070105303, 0.19224442351096047),
 (0.19316929744982803, 0.7018418078239693, 0.24321388407365968),
 (0.1952419354731103, 0.6990773163585398, 0.32344574679946075),
 (0.1970282015947445, 0.6966573070264102, 0.3777220811778649),
 (0.19859528420184464, 0.6945052315073723, 0.4188637990761522),
 (0.1999916314143737, 0.6925644704524734, 0.45197028257617916),
 (0.20125317221201128, 0.6907920815379025, 0.47966761189275336),
 (0.20240722638775788, 0.6891547381195408, 0.5035059989223365),
 (0.20347505050756443, 0.6876260074052308, 0.5244833910517103),
 (0.20447354824651226, 0.6861844740378025, 0.5432827721227443),
 (0.2054164524111189, 0.6848124115790541, 0.5603939330074446),
 (0.20631516405196249, 0.6834948167725491, 0.5761817437653648),
 (0.2071793642843855, 0.6822186877835893, 0.5909270920390571),
 (0.20801747320100067, 0.6809724677834178, 0.6048527893858368),
 (0.2088370052633693, 0.679745600038306, 0.618140731539243),
 (0.20964485513246672, 0.6785281560863641, 0.6309437466865638),
 (0.21044753832183283, 0.6773105080456748, 0.6433941168468681),
 (0.21125140522513897, 0.6760830215342485, 0.6556099802889619),
 (0.21206284378993928, 0.6748357481451457, 0.667700389303737),
 (0.21288848474779976, 0.6735580963671082, 0.6797695506404706),
 (0.21373542361363407, 0.6722384572623264, 0.6919206371645797),
 (0.21461147568939787, 0.6708637556281021, 0.7042594890626992),
 (0.21552548442988734, 0.6694188876970714, 0.7168985022454705),
 (0.2164877105607646, 0.6678859906840182, 0.7299610244322734),
 (0.21751034075242276, 0.666243464170332, 0.7435866500315722),
 (0.2186081730362054, 0.6644646222710646, 0.7579379391094441),
 (0.21979956608283252, 0.6625157876850336, 0.7732093159317208),
 (0.2211077892375572, 0.6603535235959728, 0.7896392897777976),
 (0.22256299530204293, 0.6579204976527576, 0.8075277991007058),
 (0.22420518847992715, 0.6551391052055489, 0.8272616286387289),
 (0.22608883645572714, 0.6519012811875542, 0.8493529246204709),
 (0.22829030785596155, 0.6480515334381642, 0.8744997507366618),
 (0.2309203976133854, 0.6433572590304286, 0.9036854186320401),
 (0.23414654527248313, 0.6374536004826926, 0.9383498275226471),
 (0.28991184223490785, 0.6283661633796339, 0.9586645236731562),
 (0.3711152842731098, 0.6174124752499043, 0.9586047646790773),
 (0.433280341176423, 0.6065273407962815, 0.9585467098271748),
 (0.48495084928724946, 0.5956179519079006, 0.9584898476236011),
 (0.5299373496303589, 0.5845903992076437, 0.958433705924678),
 (0.5703459526189215, 0.5733462431081702, 0.9583778357681169),
 (0.6074990214813099, 0.5617786874037659, 0.958321796812743),
 (0.6423044349219739, 0.5497680051256467, 0.9582651433656727),
 (0.6754310564713515, 0.537175740210078, 0.958207410045509),
 (0.7074028072409081, 0.5238369847961033, 0.9581480960870984),
 (0.7386542715338683, 0.5095496401068985, 0.9580866471297872),
 (0.7695666894320189, 0.49405886791942427, 0.9580224330162374),
 (0.8004936186423958, 0.47703363533737203, 0.9579547196007522),
 (0.8317813818392846, 0.45802969463011584, 0.957882631713716),
 (0.8637875432680473, 0.4364279539918168, 0.9578051030576659),
 (0.8968999096809337, 0.41132483095524197, 0.9577208065763482),
 (0.9315584897133504, 0.3813193539012562, 0.9576280551170352),
 (0.9579148533500138, 0.358831186992106, 0.9474115985773391),
 (0.9590000285927794, 0.36894286394742526, 0.9138608732554839),
 (0.9599527412330832, 0.37756180809591877, 0.8829587794466134),
 (0.9608021289731828, 0.385057400903283, 0.8541166376521975),
 (0.9615698478167679, 0.3916890619185551, 0.8268671491444017),
 (0.962272393509669, 0.3976451968965351, 0.8008274363432775),
 (0.9629226190623822, 0.4030666389664324, 0.7756731656155915),
 (0.9635307574111988, 0.4080613988283163, 0.7511195330357178),
 (0.9641051300109585, 0.4127143020414692, 0.7269064419927672),
 (0.964652650945934, 0.41709349646609717, 0.7027860449400549),
 (0.9651791951613143, 0.4212549802305815, 0.6785112441648762),
 (0.9656898750948933, 0.42524584448753155, 0.6538238731478789),
 (0.96618925519043, 0.42910666520573837, 0.6284411332095703),
 (0.9666815246136576, 0.43287332510462706, 0.6020383616245532),
 (0.9673068486894055, 0.43760373463479557, 0.5661632485543318)]
 
def getColors(n):
    cd = 100.0/n
    ca = []
    for c in range(n):
        i=int(c*cd)
        if (i>99):
            i=99
        ca.append(colors[i])
    return ca
    
def checkPixShape(pix_shape):
    for d in pix_shape:
        if d != pix_shape[0]:
            return False
    return True
    
def normInputData(input_data):
    max = input_data.max()
    if max > 65535.0:
        return input_data/max
    elif max > 255.0:
        return input_data/65535.0
    elif max > 1.0:
        return input_data/255.0
    else:
        return input_data/max
        
def findHistCutoff(h, p):
    totalPixels=0.0
    ca=h[0]
    cv=h[1]
    for c in ca:
        totalPixels += c
    th=totalPixels*p
    i=0
    cutOffPixels=0.0
    for c in ca:
        if cutOffPixels >= th:
            return cv[i]
        cutOffPixels += c
        i+=1
    return cv[i-1]        
    
def applyImageCutoff(nda, cv):
    for idx, v in np.ndenumerate(nda):
        if (v>cv):
            nda[idx]=cv
            
def findCutoffAvg(nda, cv):
    total = 0.0
    for v in np.nditer(nda):
        if (v>cv):
            total += cv
        else:
            total += v
    avg = total / nda.size
    return avg
    
def normalizeChannel(bval, nda):
    for idx, v in np.ndenumerate(nda):
        n = nda[idx] / bval
        if n < 1.0:
            n=1.0
        l = math.log(n)
        if (l>5.0):
            l=5.0
        nda[idx]=l
    min=nda.min()
    max=nda.max()
    zeroFlag=False
    if min==max:
        nda=0.0
    else:
        s = (max-min)
        for idx, v in np.ndenumerate(nda):
            n = (v-min)/s
            nda[idx]=n

def handler(event, context):
    s3c = boto3.client('s3')
    input_bucket = event['input_bucket']
    input_keys = event['input_keys']
    artifact_keys = event['artifact_keys']
    artifact_sizes = event['artifact_sizes']
    
    input_data = []

    if len(input_keys)==0:
        return {
            'success' : "False",
            'errorMsg' : "one or more input keys required"
        }
        
    if len(artifact_keys)==0:
        return {
            'success' : "False",
            'errorMsg' : "one or more artifact_keys required"
        }

    if len(artifact_sizes)!=len(artifact_keys):
        return {
            'success' : "False",
            'errorMsg' : "each artifact_key must have corresponding artifact_size"
        }
        
    elif len(input_keys)==1:
        input_key = input_keys[0]
        fileObject = s3c.get_object(Bucket=input_bucket, Key=input_key)
        file_stream = fileObject['Body']
        im = Image.open(file_stream)
        input_data = np.array(im)
        if len(input_data.shape)==2:
            input_data = np.expand_dims(input_data, axis=0)
        
    else:
        input_arr = []
        input_shape = []
        for input_key in input_keys:
            fileObject = s3c.get_object(Bucket=input_bucket, Key=input_key)
            file_stream = fileObject['Body']
            im = Image.open(file_stream)
            pix = np.array(im)
            input_shape.append(pix.shape)
            input_arr.append(pix)

        if not checkPixShape(input_shape):
            return {
                'success' : "False",
                'errorMsg' : "input channel dimensions do not match"
            }
            
        input_data = np.array(input_arr)
        
    print("input_data shape=", input_data.shape)
    input_data = normInputData(input_data)
    
    for c in range(input_data.shape[0]):
        channelData = input_data[c]
        h1 = histogram(channelData, 100)
        bcut = findHistCutoff(h1, 0.20)
        bavg = findCutoffAvg(channelData, bcut)
        normalizeChannel(bavg, channelData)
        
    # Need to create 2D MIP
    height = input_data.shape[-2]
    width = input_data.shape[-1]
    print("height=", height, " width=", width)
    mip = np.zeros(shape=(height, width, 3), dtype=np.uint8)
    mipMax = np.zeros(shape=(height, width), dtype=np.float32)
    mipLabel = np.zeros(shape=(height, width), dtype=np.uint8)
    
    ca = getColors(input_data.shape[0])

    for c in range(input_data.shape[0]):
        channelData = input_data[c]
        for idx, v in np.ndenumerate(channelData):
            w0=idx[-1]
            h0=idx[-2]
            vmax = mipMax[h0][w0]
            if v>vmax:
                mipMax[h0][w0]=v
                mipLabel[h0][w0]=c
                
    for idx, v in np.ndenumerate(mipMax):
        h0=idx[0]
        w0=idx[1]
        c=mipLabel[h0][w0]
        cav = ca[c]
        mip[h0][w0][0]=cav[0]*v*255.99
        mip[h0][w0][1]=cav[1]*v*255.99
        mip[h0][w0][2]=cav[2]*v*255.99

    img=Image.fromarray(mip)
    output_bucket = event['output_bucket']
    
    for artifact_key, artifact_size in zip(artifact_keys, artifact_sizes):
        image_type = artifact_key[-3:]
        asize = float(artifact_size)
        if height > width:
            artifact_height = int(asize)
            artifact_width = int((width/height)*artifact_height)
        else:
            artifact_width = int(asize)
            artifact_height = int((height/width)*artifact_width)

        artifact_img = img.resize((artifact_width, artifact_height))
        artifact_buffer = BytesIO()
        artifact_img.save(artifact_buffer, format=image_type)
        artifact_buffer.seek(0)
        s3c.upload_fileobj(artifact_buffer, output_bucket, artifact_key)

    return { 
        'input_bucket' : event['input_bucket'],
        'input_keys' : input_keys,
        'output_bucket' : event['output_bucket'],
        'artifact_keys' : artifact_keys,
        'artifact_sizes' : artifact_sizes
    }  
    