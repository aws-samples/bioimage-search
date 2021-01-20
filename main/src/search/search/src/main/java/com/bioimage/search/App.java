package com.bioimage.search;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.*;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Base64;
import java.nio.ByteBuffer;
import java.nio.FloatBuffer;
import java.util.concurrent.*;


public class App {
	public static String TRAINING_CONFIGURATION_LAMBDA_ARN=System.getenv("TRAINING_CONFIGURATION_LAMBDA_ARN");
    public static String MESSAGE_LAMBDA_ARN=System.getenv("MESSAGE_LAMBDA_ARN");
    public static String SEARCH_LAMBDA_ARN=System.getenv("SEARCH_LAMBDA_ARN");
    public static String SEARCH_QUEUE_URL=System.getenv("SEARCH_QUEUE_URL");
    public static String MANAGEMENT_QUEUE_URL=System.getenv("MANAGEMENT_QUEUE_URL");
    public static String REGION=System.getenv("REGION");

	private static App theApp = null;
	private static SqsClient sqsClient = null;
	
	private static Map<String, Map<String, float[]>> trainMap = new HashMap<>();
	
	private App() {
		Region region = Region.of(REGION);
		sqsClient = SqsClient.builder().region(region).build();
	}
	
	public static App getApp() {
		if (theApp==null) {
			theApp = new App();
		}
		return theApp;
	}
	
    public static void main(String[] args) {
    	App app = getApp();
    	app.start();
    }
    
    private void start() {
		int i=0;
		while(true) {
			if (i%10==0) {
		    	System.out.println("Region="+REGION+" Count v7 =" + i);
			}
	    	try {
	    		// Receive messages from the queue
	            ReceiveMessageRequest receiveRequest = ReceiveMessageRequest.builder()
	                .queueUrl(SEARCH_QUEUE_URL)
	                .build();
	            List<Message> messages = sqsClient.receiveMessage(receiveRequest).messages();
	            
	            for (Message m : messages) {
					handleSearchMessage(m);
	            }
	            
	            for (Message message : messages) {
	                DeleteMessageRequest deleteMessageRequest = DeleteMessageRequest.builder()
	                    .queueUrl(SEARCH_QUEUE_URL)
	                    .receiptHandle(message.receiptHandle())
	                    .build();
	                sqsClient.deleteMessage(deleteMessageRequest);
	            }
                
				TimeUnit.SECONDS.sleep(1);
				
	    	} catch (Exception ex) {
				ex.printStackTrace();
	    	}
	    	i+=1;
		}
    }
    
    private void handleSearchMessage(Message message) {
    	String[] messageArr = (message.body()).split("\n");
    	if (messageArr[0].equals("plateEmbedding")) {
    		addPlateEmbedding(messageArr);
    	}
    }
    
    private void addPlateEmbedding(String[] messageArr) {
    	String trainId = messageArr[1];
    	System.out.println("trainId="+trainId);
    	String plateId = messageArr[2];
    	System.out.println("plateId="+plateId);
    	for (int i=3;i<messageArr.length;i+=2) {
    		String imageId = messageArr[i];
    		String e64 = messageArr[i+1];
    		if (i==3) {
    			System.out.println("imageId="+imageId);
    			System.out.println("e64="+e64);
    			String[] e64Arr = e64.split("\'");
    			String e64string = e64Arr[1];
    			byte[] e64b = Base64.getDecoder().decode(e64string);
    			float[] e64f = bytesToFloats(e64b);
    			for (int j=0;j<e64f.length;j++) {
    				System.out.println("j="+j+" f="+e64f[j]);
    			}
    		}
    	}
    }
    
    public static float[] bytesToFloats(byte[] bytes) {
        if (bytes.length % Float.BYTES != 0)
            throw new RuntimeException("Illegal length");
        float floats[] = new float[bytes.length / Float.BYTES];
        ByteBuffer.wrap(bytes).asFloatBuffer().get(floats);
        return floats;
    }

}

