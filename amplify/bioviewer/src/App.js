import React from 'react';

import Amplify, { Auth } from 'aws-amplify';
import aws_exports from './aws-exports';

import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { Header } from 'semantic-ui-react';

Amplify.configure(aws_exports);

var AWS = require('aws-sdk')

const credentials = Auth.currentCredentials();

Auth.currentSession().then(function(data) {
  const userName = data.getIdToken().payload['cognito:username'];
  console.log("userName="+userName)
}, function(error) {
  console.log(error)  
});

credentials.then(function(data) { 
    console.log(data)
    const essentialCredentials = Auth.essentialCredentials(data)
    //console.log(essentialCredentials)
    //AWS.config.credentials = essentialCredentials
//    const cred2 = {
//      accessKeyId: data.accessKeyId,
//      secretAccessKey: data.secretAccessKey
//    }
//    console.log(cred2)
console.log("accessKeyId=" + data.accessKeyId)
console.log("secretAccessKey=" + data.secretAccessKey)
console.log("=======")
console.log(essentialCredentials)
console.log("accessKeyId=" + essentialCredentials.accessKeyId)
console.log("secretAccessKey=" + essentialCredentials.secretAccessKey)

//    AWS.config = {
//      region: 'us-east-1',
//      accessKeyId: data.accessKeyId,
//      secretAccessKey: data.secretAccessKey
//    }
    
//    var myConfig = AWS.Config({
//      credentials: credentials,
//      region: 'us-east-1'
//    })
//    console.log(myConfig)
//    const s3 = new AWS.S3({
//      region: 'us-east-1',
//      credentials: cred2
//    })
  console.log("============1")
  let sts = new AWS.STS({
    region: 'us-east-1',
    credentials: essentialCredentials
  });
  sts.getCallerIdentity({}, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
  console.log("============2")

  const s3 = new AWS.S3({
    region: 'us-east-1',
    credentials: essentialCredentials,
    params: { Bucket: 'apigw-test-43762' }
  })
  
//  s3.listBuckets(function(err, data) {
//    if (err) console.log(err, err.stack); // an error occurred
//    else     console.log(data);           // successful response
//  });
  
//  const bucketParam = {
//    Bucket: 'apigw-test-43762',
//  }
  
  //s3.listObjects( { Delimiter: "/" }, function(err, data) {
  //  if (err) {
  //    console.log(err)
  //  }
  //  console.log(data)
  //})
  
    var getParams = {
      Key: 'helloworld.txt'
    }
    s3.getObject(getParams, function(err, data) {
      if (err) {
        console.log(err)
      }
      console.log(data)
      let objectData = data.Body.toString('utf-8');
      console.log(objectData)
    })

  },
  function(error) {
    console.log(error)
})

console.log("log test2")

const App = () => (
  <div>
    <AmplifySignOut />
    <Header as="h1">
      Yes!
    </Header>
  </div>
)

export default withAuthenticator(App, {
  includeGreetings: true,
  signUpConfig: {
    hiddenDefaults: ['phone_number']
  }
});
