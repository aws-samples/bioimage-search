import sys
import boto3
import pandas as pd

class Bbbc021PlateInfo:
    def __init__(self, bbbc021bucket, plateName):
        imageMetadataKey='BBBC021_v1_image.csv'
        moaKey='BBBC021_v1_moa.csv'
        self._s3c = boto3.client('s3')
        image_df = self.getCsvDfFromS3(bbbc021bucket, imageMetadataKey)
        moa_df = self.getCsvDfFromS3(bbbc021bucket, moaKey)
        
        moa_label_number_map = {}
        moa_unique_arr = moa_df['moa'].unique()
        moa_unique_arr.sort()
        for i, l in enumerate(moa_unique_arr):
            moa_label_number_map[l] = i

        compound_moa_map = {}
        for i in moa_df.index:
            r = moa_df.iloc[i]
            compound = r['compound']
            moa = r['moa']
            compound_moa_map[compound] = moa
            
        self._dapiFiles=[]
        self._tubulinFileDict={}
        self._actinFileDict={}
        self._wellFileDict={}
        self._compoundFileDict={}
        self._concentrationFileDict={}
        self._moaFileDict={}

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
            self._wellFileDict[dapiFilePath]=r['Image_Metadata_Well_DAPI']
            c = r['Image_Metadata_Compound']
            self._compoundFileDict[dapiFilePath]=c
            self._concentrationFileDict[dapiFilePath]=r['Image_Metadata_Concentration']
            if c in compound_moa_map:
                self._moaFileDict[dapiFilePath]=compound_moa_map[c]
            
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
        
    def getWellByDapi(self, dapiFile):
        return self._wellFileDict[dapiFile]
        
    def getCompoundByDapi(self, dapiFile):
        return self._compoundFileDict[dapiFile]
        
    def getConcentrationByDapi(self, dapiFile):
        return self._concentrationFileDict[dapiFile]
        
    def getMoaByDapi(self, dapiFile):
        if dapiFile in self._moaFileDict:
            return self._moaFileDict[dapiFile]
        return None
