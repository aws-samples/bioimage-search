package com.bioimage.search;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.CreateQueueRequest;
import software.amazon.awssdk.services.sqs.model.CreateQueueResponse;
import software.amazon.awssdk.services.sqs.model.GetQueueUrlRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.QueueNameExistsException;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageBatchRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageBatchRequestEntry;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import java.util.Date;
import java.util.List;
import java.util.Map;
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
	    	System.out.println("Region="+REGION+" search queue="+SEARCH_QUEUE_URL+" Count v5 =" + i);
	    	try {
	    		// Receive messages from the queue
	            ReceiveMessageRequest receiveRequest = ReceiveMessageRequest.builder()
	                .queueUrl(SEARCH_QUEUE_URL)
	                .build();
	            List<Message> messages = sqsClient.receiveMessage(receiveRequest).messages();

	            // Print out the messages
	            for (Message m : messages) {
	            	System.out.println("\n" +m.body());
	            }
                
				TimeUnit.SECONDS.sleep(1);
				
	    	} catch (Exception ex) {
				ex.printStackTrace();
	    	}
	    	i+=1;
		}
    }

}

