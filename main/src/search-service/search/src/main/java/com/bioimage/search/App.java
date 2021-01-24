package com.bioimage.search;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.*;
import software.amazon.awssdk.services.lambda.LambdaClient;
import software.amazon.awssdk.services.lambda.model.InvokeRequest;
import software.amazon.awssdk.services.lambda.model.InvokeResponse;
import software.amazon.awssdk.services.lambda.model.LambdaException;
import software.amazon.awssdk.core.SdkBytes;

import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Base64;
import java.util.Comparator;
import java.util.Set;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
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
	private static Map<String, Map<String, ImageEmbedding>> trainMap = new HashMap<>();
	
	private SqsClient sqsClient = null;
	private LambdaClient lambdaClient = null;
	private ImageEmbedding[] hitArray = null;

	private App() {
		Region region = Region.of(REGION);
		sqsClient = SqsClient.builder().region(region).build();
		lambdaClient = LambdaClient.builder().region(region).build();
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
    
   	public double computeEuclideanDistance(float[] a, float[] b) {
   		double t=0.0;
   		for (int i=0;i<a.length;i++) {
   			double d = a[i]-b[i];
   			t+= d*d;
   		}
   		double ts = Math.sqrt(t);
   		return ts;
   	}

    private class ImageEmbedding implements Comparator<ImageEmbedding> {
    	public String imageId;
    	public float[] embedding;
    	
    	public ImageEmbedding(String imageId, float[] embedding) {
    		this.imageId=imageId;
    		this.embedding=embedding;
    	}
    	
    	public int compare(ImageEmbedding o1, ImageEmbedding o2) {
			double d1=computeEuclideanDistance(this.embedding, o1.embedding);
			double d2=computeEuclideanDistance(this.embedding, o2.embedding);
			if (d1>d2) {
				return 1;
			} else if (d2>d1) {
				return -1;
			} else {
				return 0;
			}
    	}

    }
    
    private void start() {
		int i=0;
		while(true) {
			if (i%100==0) {
		    	System.out.println("Region="+REGION+" Count v10 =" + i);
			}
			List<Message> messages = null;
	    	try {
	    		// Receive messages from the queue
	            ReceiveMessageRequest receiveRequest = ReceiveMessageRequest.builder()
	                .queueUrl(SEARCH_QUEUE_URL)
	                .build();
	            messages = sqsClient.receiveMessage(receiveRequest).messages();
	            for (Message m : messages) {
	            	try {
						handleSearchMessage(m);
	            	} catch (Exception ex) {
	            		ex.printStackTrace();
	            		updateStatusToError(m);
	            	}
	            }
	    	} catch (Exception ex) {
				ex.printStackTrace();
	    	}
	    	try {
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
    
    private void updateStatusToError(Message m) {
    	String[] messageArr = (m.body()).split("\n");
    	String type = messageArr[0];
    	if (type.equals("searchByImageId")) {
    		String searchId = messageArr[1];
			InvokeResponse res = null ;
	        try {
       			String payloadString = "{\n";
       			payloadString += "\"method\": \"updateSearchStatus\",\n";
       			payloadString += "\"searchId\": \""+searchId+"\",\n";
       			payloadString += "\"status\": \"STATUS_ERROR\"\n";
       			payloadString += "}";
            	SdkBytes payload = SdkBytes.fromUtf8String(payloadString);
            	InvokeRequest request = InvokeRequest.builder()
                    .functionName(SEARCH_LAMBDA_ARN)
                    .payload(payload)
                    .build();
            	res = lambdaClient.invoke(request);
	            String value = res.payload().asUtf8String() ;
	            System.out.println(value);
        	} catch(LambdaException e) {
	            System.err.println(e.getMessage());
	        }
    	}
    }
    
    private void handleSearchMessage(Message message) {
    	String[] messageArr = (message.body()).split("\n");
    	if (messageArr[0].equals("plateEmbedding")) {
    		addPlateEmbedding(messageArr);
    	} else if (messageArr[0].equals("searchByImageId")) {
    		searchByImageId(messageArr);
    	}
    }
    
    private Map<String, ImageEmbedding> getImageMap(String trainId) {
    	System.out.println("getImageMap() trainId="+trainId);
    	Map<String, ImageEmbedding> imageMap = trainMap.get(trainId);
    	if (imageMap==null) {
    		System.out.println("Check - map is null - allocating new");
    		imageMap = new HashMap<String, ImageEmbedding>();
    		trainMap.put(trainId, imageMap);
    	} else {
    		System.out.println("Map is not new - size="+imageMap.size());
    	}
    	return imageMap;
    }
    
    private void addPlateEmbedding(String[] messageArr) {
    	System.out.println("Adding plateEmbedding");
    	String trainId = messageArr[1];
    	System.out.println(">trainId="+trainId);
    	String plateId = messageArr[2];
    	System.out.println(">plateId="+plateId);
		Map<String, ImageEmbedding> imageMap = getImageMap(trainId);
    	for (int i=3;i<messageArr.length;i+=2) {
    		String imageId = messageArr[i];
    		String e64 = messageArr[i+1];
   			String[] e64Arr = e64.split("\'");
   			String e64string = e64Arr[1];
   			byte[] e64b = Base64.getDecoder().decode(e64string);
   			float[] e64f = bytesToFloats(e64b);
			imageMap.put(imageId, new ImageEmbedding(imageId, e64f));
    	}
    	System.out.println(">image entries="+imageMap.size());
    }
    
    public static float[] bytesToFloats(byte[] bytes) {
        if (bytes.length % Float.BYTES != 0)
            throw new RuntimeException("Illegal length");
        float floats[] = new float[bytes.length / Float.BYTES];
        ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer().get(floats);
        return floats;
    }
    
    private void searchByImageId(String[] messageArr) {
    	String searchId=messageArr[1];
    	String trainId=messageArr[2];
    	String imageId=messageArr[3];
    	String metric=messageArr[4];
    	int maxHits=new Integer(messageArr[5]);
    	
    	System.out.println("trainId="+trainId+", imageId="+imageId+", metric="+metric+", maxHits="+maxHits);
    	long timestamp1=new Date().getTime();
    	Map<String, ImageEmbedding> imageMap = getImageMap(trainId);
    	System.out.println("imageMap size="+imageMap.size());
    	ImageEmbedding[] arr = new ImageEmbedding[imageMap.size()];
    	Set<Map.Entry<String, ImageEmbedding>> entrySet = imageMap.entrySet();
    	int i=0;
		for (Map.Entry<String, ImageEmbedding> im : entrySet) {
			arr[i]=im.getValue();
			i+=1;
		}
		System.out.println("Added "+i+" array entries");
		ImageEmbedding queryImage=imageMap.get(imageId);
		if (queryImage==null) {
			System.out.println("queryImage is null");
			return;
		}
		System.out.println("pre arr length="+arr.length);
    	long timestamp2=new Date().getTime();
		Arrays.parallelSort(arr, queryImage);
		long timestamp3=new Date().getTime();
		System.out.println("post arr length="+arr.length);
		long createArrayMs=timestamp2-timestamp1;
		long sortMs=timestamp3-timestamp2;
		System.out.println("Closest two matches are "+arr[0].imageId+", "+arr[1].imageId);
		System.out.println("Create array ms="+createArrayMs);
		System.out.println("Sort ms="+sortMs);

		if (hitArray==null || hitArray.length!=maxHits) {
			hitArray = new ImageEmbedding[maxHits];
		}
		for (i=0;i<maxHits;i++) {
			hitArray[i]=arr[i];
		}
		
        createSearchResults(searchId, queryImage, hitArray);
        long timestamp4=new Date().getTime();
        long messageMs=timestamp4-timestamp3;
        System.out.println("Result message ms="+messageMs);
    }
    
    private void createSearchResults(String searchId, ImageEmbedding queryImage, ImageEmbedding[] hitArray) {
    	float[] queryEmbedding = queryImage.embedding;
		String payloadString = "{\n";
		payloadString += "\"method\": \"createSearchResults\",\n";
		payloadString += "\"searchId\": \""+searchId+"\",\n";
		payloadString += "\"hits\": [\n";
		for (int i=0;i<hitArray.length;i++) {
			String imageId = hitArray[i].imageId;
			float[] imageEmbedding = hitArray[i].embedding;
			double distance = computeEuclideanDistance(queryEmbedding, imageEmbedding);
			payloadString += "{\n";
			payloadString += "\"imageId\": \""+imageId+"\",\n";
			payloadString += "\"rank\": \""+i+"\",\n";
			payloadString += "\"distance\": \""+distance+"\"\n";
			if (i<(hitArray.length-1)) {
				payloadString += "},\n";
			} else {
				payloadString += "}\n";
			}
		}
		payloadString += "]\n";
		payloadString += "}";
		
		InvokeResponse res = null ;
        try {
            SdkBytes payload = SdkBytes.fromUtf8String(payloadString);

            InvokeRequest request = InvokeRequest.builder()
                    .functionName(SEARCH_LAMBDA_ARN)
                    .payload(payload)
                    .build();

            res = lambdaClient.invoke(request);
            String value = res.payload().asUtf8String() ;
            System.out.println(value);

        } catch(LambdaException e) {
            System.err.println(e.getMessage());
        }
    }

}

