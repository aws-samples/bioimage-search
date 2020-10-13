import sys
import boto3
import pandas as pd

class Bbbc021PlateInfo:
    def __init__(self, bbbc021bucket, plateName):
        imageMetadataKey='BBBC021_v1_image.csv'
        self._s3c = boto3.client('s3')
        image_df = self.getCsvDfFromS3(bbbc021bucket, imageMetadataKey)
        
        self._dapiFiles=[]
        self._tubulinFileDict={}
        self._actinFileDict={}

        weekPrefix = plateName.split('_')[0]
        imagePathnameDapi = weekPrefix + '/' + plateName
        plate_df = image_df.loc[image_df['Image_PathName_DAPI']==imagePathnameDapi]

        for p in range(len(plate_df.index)):
            r = plate_df.iloc[p]
            dapiFile=r['Image_FileName_DAPI']
            dapiFilePath = plateName + '/' + dapiFile
            self._dapiFiles.append(dapiFilePath)
            self._tubulinFileDict[dapiFilePath]=plateName + '/' + r['Image_FileName_Tubulin']
            self._actinFileDict[dapiFilePath]=plateName + '/' + r['Image_FileName_Actin']
            
    def getCsvDfFromS3(self, bucket, key):
        csvObject = self._s3c.get_object(Bucket=bucket, Key=key)
        file_stream = csvObject['Body']
        df = pd.read_csv(file_stream)
        return df
        
    def getDapiFileList(self):
        return self._dapiFiles
        
    def getTubulinFileByDapi(self, dapiFile):
        return self._tubulinFileDict[dapiFile]
        
    def getActinFileByDapi(self, dapiFile):
        return self._actinFileDict[dapiFile]
