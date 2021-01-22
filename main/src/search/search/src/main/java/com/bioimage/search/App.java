package com.bioimage.search;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.*;
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
	private static SqsClient sqsClient = null;
	
	private static Map<String, Map<String, ImageEmbedding>> trainMap = new HashMap<>();
	
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
    	
    	public double computeEuclideanDistance(float[] a, float[] b) {
    		double t=0.0;
    		for (int i=0;i<a.length;i++) {
    			double d = a[i]-b[i];
    			t+= d*d;
    		}
    		double ts = Math.sqrt(t);
    		return ts;
    	}
    	
    }
    
    private void start() {
		int i=0;
		while(true) {
			if (i%100==0) {
		    	System.out.println("Region="+REGION+" Count v9 =" + i);
			}
			List<Message> messages = null;
	    	try {
	    		// Receive messages from the queue
	            ReceiveMessageRequest receiveRequest = ReceiveMessageRequest.builder()
	                .queueUrl(SEARCH_QUEUE_URL)
	                .build();
	            messages = sqsClient.receiveMessage(receiveRequest).messages();
	            for (Message m : messages) {
					handleSearchMessage(m);
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
    	System.out.println("Check0");
    	String trainId=messageArr[1];
    	String imageId=messageArr[2];
    	System.out.println("trainId="+trainId+", imageId="+imageId);
    	long startTimestamp1=new Date().getTime();
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
		} else {
			float[] e = queryImage.embedding;
			for (i=0;i<e.length;i++) {
				System.out.println("queryImage i="+i+", e="+e[i]);
			}
		}
		System.out.println("pre arr length="+arr.length);
    	long startTimestamp2=new Date().getTime();
		Arrays.parallelSort(arr, queryImage);
		long endTimestamp=new Date().getTime();
		System.out.println("post arr length="+arr.length);
		long stage1Ms=startTimestamp2-startTimestamp1;
		long sortMs=endTimestamp-startTimestamp2;
		System.out.println("Closest two matches are "+arr[0].imageId+", "+arr[1].imageId);
		System.out.println("Stage1 ms="+stage1Ms);
		System.out.println("Sort ms="+sortMs);
    }

}

