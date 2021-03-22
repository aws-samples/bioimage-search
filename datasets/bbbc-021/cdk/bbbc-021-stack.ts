import * as cdk from '@aws-cdk/core';
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import s3assets = require('@aws-cdk/aws-s3-assets');
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as lambda from '@aws-cdk/aws-lambda';
import * as logs from '@aws-cdk/aws-logs';
import * as cr from '@aws-cdk/custom-resources';


export class Bbbc021Stack extends cdk.Stack {
    
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        
        super(scope, id, props);
        
        const bbbc021Bucket = new s3.Bucket(this, 'bbbc021Bucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
        });
        
        const codebuildRole2 = new iam.Role(this, 'codebuildRole2', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
        });
        
        bbbc021Bucket.grantReadWrite(codebuildRole2)
            
        // NOTE: the project name must be changed to update (rerun) the CodeBuild build
        const loadProject = new codebuild.Project(this, 'LoadProjectv23', {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    build: {
                        commands: [
                            'touch upload.sh',
                            'touch uploadMeta.sh',
                            'touch files.txt',
                            
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week1_22123.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week1_22141.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week1_22161.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week1_22361.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week1_22381.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week1_22401.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week2_24121.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week2_24141.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week2_24161.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week2_24361.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week2_24381.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week2_24401.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week3_25421.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week3_25441.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week3_25461.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week3_25681.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week3_25701.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week3_25721.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week4_27481.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week4_27521.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week4_27542.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week4_27801.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week4_27821.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week4_27861.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week5_28901.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week5_28921.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week5_28961.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week5_29301.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week5_29321.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week5_29341.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week6_31641.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week6_31661.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week6_31681.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week6_32061.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week6_32121.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week6_32161.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week7_34341.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week7_34381.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week7_34641.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week7_34661.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week7_34681.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week8_38203.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week8_38221.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week8_38241.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week8_38341.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week8_38342.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week9_39206.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week9_39221.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week9_39222.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week9_39282.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week9_39283.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week9_39301.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week10_40111.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week10_40115.zip\'" >> files.txt',
                            'echo "\'https://data.broadinstitute.org/bbbc/BBBC021/BBBC021_v1_images_Week10_40119.zip\'" >> files.txt',
                            
                            'echo "#!/usr/bin/env bash" >> upload.sh',
                            'echo "i=\\\$1" >> upload.sh',
                            'echo "echo \\\$i" >> upload.sh',
                            'echo "dirKey=\\\${i:45:-4}" >> upload.sh',
                            'echo "fileKey=\"\\\${dirKey}.zip\"" >> upload.sh',
                            'echo "mkdir -p \\\$dirKey" >> upload.sh',
                            'echo "cd \\\$dirKey" >> upload.sh',
                            'echo "wget -q \\\$i" >> upload.sh',
                            'echo "unzip -q \\\$fileKey" >> upload.sh',
                            'echo "rm \\\$fileKey" >> upload.sh',
                            'echo "aws s3 cp . s3://\$BBBC021_BUCKET --recursive --quiet" >> upload.sh',
                            'echo "cd .." >> upload.sh',
                            'echo "rm -r \\\$dirKey" >> upload.sh',

                            'which bash',
                            'cat upload.sh',

                            'chmod +x upload.sh',
                            'cat files.txt | xargs -n 1 -P 5 ./upload.sh',

                            'echo "Metafiles=(\'BBBC021_v1_image.csv\' \'BBBC021_v1_compound.csv\' \'BBBC021_v1_moa.csv\')" >> uploadMeta.sh',
                            'echo "for i in \"\\\${Metafiles[@]}\"; do" >> uploadMeta.sh',
                            'echo "    url=\"https://data.broadinstitute.org/bbbc/BBBC021/\\\${i}\"" >> uploadMeta.sh',
                            'echo "    wget \\\$url" >> uploadMeta.sh',
                            'echo "    aws s3 cp \\\$i s3://\$BBBC021_BUCKET" >> uploadMeta.sh',
                            'echo "    rm \\\$i" >> uploadMeta.sh',
                            'echo "done" >> uploadMeta.sh',
                            'echo "echo \"Upload of BBBC021 complete\"" >> uploadMeta.sh',
                            
                            'bash uploadMeta.sh'
                        ],
                    },
                },
            }),
            environment: {
                environmentVariables: {
                    "BBBC021_BUCKET" : { value: bbbc021Bucket.bucketName }                
                },
                computeType: codebuild.ComputeType.LARGE
            },
            timeout: cdk.Duration.minutes(480),
            role: codebuildRole2
        });

//                For above, there is option of environment:
//                computeType: codebuild.ComputeType.LARGE
        

        function triggerHandler(event: any, _context: any, callback: any) {
            const aws = require('aws-sdk');
            const codebuild = new aws.CodeBuild()
            
            console.log("triggerHandler event start")
            console.log(event)
            console.log("triggerHandler event end")
            
            if (event.RequestType === 'Create' || event.RequestType === 'Update') {
                codebuild.startBuild({
                    projectName: process.env.CODEBUILD_PROJECT_NAME
                }, function(err: any, data: any) {
                    if (err) console.log(err, err.stack);
                    else console.log(data)
                });
            }
        }
        
        const lambdaTriggerRole = new iam.Role(this, 'lambdaTriggerRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
        });

        lambdaTriggerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCodeBuildDeveloperAccess'))
        lambdaTriggerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

        const loadTriggerFunction = new lambda.Function(this, 'LoadTriggerFunction', {
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`exports.handler = ${triggerHandler.toString()}`),
            environment: {
                "CODEBUILD_PROJECT_NAME" : loadProject.projectName
            },
            role: lambdaTriggerRole,
            timeout: cdk.Duration.minutes(5)
        })
        
        const loadTriggerProvider = new cr.Provider(this, 'LoadTriggerProvider', {
            onEventHandler: loadTriggerFunction,
            logRetention: logs.RetentionDays.ONE_DAY
        })
        
        const loadResource = new cdk.CustomResource(this, 'LoadResource', { 
            serviceToken: loadTriggerProvider.serviceToken,
            properties: {
                Dependency1: loadProject.projectName
            }
        });

    }

}