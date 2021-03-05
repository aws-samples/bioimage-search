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
import java.util.HashSet;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.util.concurrent.*;
import java.util.stream.*;


public class App {
	public static String TRAINING_CONFIGURATION_LAMBDA_ARN=System.getenv("TRAINING_CONFIGURATION_LAMBDA_ARN");
    public static String MESSAGE_LAMBDA_ARN=System.getenv("MESSAGE_LAMBDA_ARN");
    public static String SEARCH_LAMBDA_ARN=System.getenv("SEARCH_LAMBDA_ARN");
    public static String TAG_LAMBDA_ARN=System.getenv("TAG_LAMBDA_ARN");
    public static String SEARCH_QUEUE_URL=System.getenv("SEARCH_QUEUE_URL");
    public static String MANAGEMENT_QUEUE_URL=System.getenv("MANAGEMENT_QUEUE_URL");
    public static String REGION=System.getenv("REGION");

	private static App theApp = null;
	private static Map<String, Map<String, ImageEmbedding>> trainMap = new HashMap<>();
	private static Map<String, int[]> tagMap = new HashMap<>();
	private static Map<Integer, String> tagLabelMap = new HashMap<>();
	
	private SqsClient sqsClient = null;
	private LambdaClient lambdaClient = null;
	private ImageEmbedding[] hitArray = null;
	
	private static int EUCLIDEAN_TYPE = 1;
	private static int COSINE_TYPE = 2;
	private static int DEFAULT_METRIC = COSINE_TYPE;
	
	private int distanceType=DEFAULT_METRIC;

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
   	
   	public double computeDistance(float[] a, float[] b) {
   		if (distanceType==EUCLIDEAN_TYPE) {
   			return computeEuclideanDistance(a, b);
   		} else if (distanceType==COSINE_TYPE) {
   			return -1.0 * cosine(a, b);
   		} else {
   			return 0.0;
   		}
   	}
   	
   	public double dot(float[] a, float[] b) {
   		double t=0.0;
   		for (int i=0;i<a.length;i++) {
   			t += a[i]*b[i];
   		}
		return t;
   	}
   	
   	public double cosine(float[] a, float[] b) {
   		return dot(a,b) / (Math.sqrt(dot(a,a)) * Math.sqrt(dot(b,b)));
   	}

    private class ImageEmbedding implements Comparator<ImageEmbedding> {
    	public String imageId;
    	public float[] embedding;
    	
    	public ImageEmbedding(String imageId, float[] embedding) {
    		this.imageId=imageId;
    		this.embedding=embedding;
    	}
    	
    	public int compare(ImageEmbedding o1, ImageEmbedding o2) {
			double d1=computeDistance(this.embedding, o1.embedding);
			double d2=computeDistance(this.embedding, o2.embedding);
			if (d1>d2) {
				return 1;
			} else if (d2>d1) {
				return -1;
			} else {
				return 0;
			}
    	}

    }
    
    private void deleteMessages(List<Message> messages, String queueUrl) {
        for (Message message : messages) {
            DeleteMessageRequest deleteMessageRequest = DeleteMessageRequest.builder()
                .queueUrl(queueUrl)
                .receiptHandle(message.receiptHandle())
                .build();
            sqsClient.deleteMessage(deleteMessageRequest);
        }
    }
    
    private void start() {
		int i=0;
		int receiveCount=0;
		while(true) {
			if (i%100==0) {
		    	System.out.println("Region="+REGION+" Count v10 =" + i);
			}
			List<Message> managementMessages = null;
			List<Message> searchMessages = null;
	    	try {
	            ReceiveMessageRequest receiveManagementRequest = ReceiveMessageRequest.builder()
	                .queueUrl(MANAGEMENT_QUEUE_URL)
	                .build();
	            managementMessages = sqsClient.receiveMessage(receiveManagementRequest).messages();
	            for (Message m : managementMessages) {
	            	try {
	            		receiveCount++;
						handleManagementMessage(m);
	            	} catch (Exception ex) {
	            		ex.printStackTrace();
	            		updateStatusToError(m);
	            	}
	            }

	            ReceiveMessageRequest receiveSearchRequest = ReceiveMessageRequest.builder()
	                .queueUrl(SEARCH_QUEUE_URL)
	                .build();
	            searchMessages = sqsClient.receiveMessage(receiveSearchRequest).messages();
	            for (Message m : searchMessages) {
	            	try {
	            		receiveCount++;
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
	            deleteMessages(managementMessages, MANAGEMENT_QUEUE_URL);
	            deleteMessages(searchMessages, SEARCH_QUEUE_URL);
	            if (receiveCount==0) {
		            TimeUnit.SECONDS.sleep(1);
	            } else {
					System.out.println("ReceiveCount="+receiveCount);
	            }
	    	} catch (Exception ex) {
	    		ex.printStackTrace();
	    	}
	    	receiveCount=0;
	    	i+=1;
		}
    }
    
    private void updateStatusToError(Message m) {
    	String[] messageArr = (m.body()).split("\n");
    	String type = messageArr[0];
    	if (type.equals("searchByImageId")) {
    		String searchId = messageArr[1];
    		updateSearchStatus(searchId, "error");
    	}
    }
    
    private void updateSearchStatus(String searchId, String statusCode) {
		InvokeResponse res = null ;
        try {
   			String payloadString = "{\n";
   			payloadString += "\"method\": \"updateSearchStatus\",\n";
   			payloadString += "\"searchId\": \"" + searchId + "\",\n";
   			payloadString += "\"status\": \"" + statusCode + "\"\n";
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

    private void handleManagementMessage(Message message) {
    	System.out.println("managementMessage");
    	String[] messageArr = (message.body()).split("\n");
    	System.out.println(messageArr[0]);
    	if (messageArr[0].equals("plateEmbedding")) {
    		addPlateEmbedding(messageArr);
    	} else if (messageArr[0].equals("plateTags")) {
    		setPlateTags(messageArr);
    	} else if (messageArr[0].equals("loadTagLabelMap")) {
    		tagLabelMap = getTagLabelMap();
    	} else if (messageArr[0].equals("logEmbeddingList")) {
    		logEmbeddingList();
    	} else if (messageArr[0].equals("deleteEmbedding")) {
    		deleteEmbedding(messageArr);
    	}
    }
    
    private void logEmbeddingList() {
    	System.out.println("logEmbeddingList:");
    	for (String embeddingName : trainMap.keySet()) {
			System.out.println(embeddingName);
    	}
    	System.out.println("==");
    }
    
    private void deleteEmbedding(String[] messageArr) {
    	String embeddingName = messageArr[1];
    	System.out.println("Deleting embedding "+embeddingName);
    	if (trainMap.containsKey(embeddingName)) {
    		trainMap.remove(embeddingName);
    	} else {
    		System.out.println("Embedding key "+embeddingName+" not found");
    	}
    }
    
    private void handleSearchMessage(Message message) {
    	System.out.println("searchMessage");
    	String[] messageArr = (message.body()).split("\n");
    	System.out.println(messageArr[0]);
		if (messageArr[0].equals("searchByImageId")) {
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
    	int i=1;
    	String searchId=messageArr[i++];
    	String trainId=messageArr[i++];
    	String imageId=messageArr[i++];
    	String metric=messageArr[i++];
    	int maxHits=new Integer(messageArr[i++]);
    	Boolean requireMoa=messageArr[i++].equals("true");
		int inclusionTagCount = new Integer(messageArr[i++]);
		Set<Integer> inclusionTags = new HashSet<>();
		int j=0;
		for (;j<inclusionTagCount;j++) {
			inclusionTags.add(new Integer(messageArr[i++]));
		}
		int exclusionTagCount = new Integer(messageArr[i++]);
		Set<Integer> exclusionTags = new HashSet<>();
		for (j=0;j<exclusionTagCount;j++) {
			exclusionTags.add(new Integer(messageArr[i++]));
		}
    	System.out.println("trainId="+trainId+", imageId="+imageId+", metric="+metric+", maxHits="+maxHits);
    	distanceType=DEFAULT_METRIC;
    	if (metric.equals("Euclidean")) {
    		distanceType=EUCLIDEAN_TYPE;
    	} else if (metric.equals("Cosine")) {
    		distanceType=COSINE_TYPE;
    	}
    	if (inclusionTagCount==0) {
    		System.out.println("inclusionTags=none");
    	} else {
    		System.out.println("inclusionTags=");
	    	for (Integer tag : inclusionTags) {
				System.out.println(tag);
	    	}
    	}
    	if (exclusionTagCount==0) {
    		System.out.println("exclusionTags=none");
    	} else {
    		System.out.println("exclusionTags=");
	    	for (Integer tag : exclusionTags) {
				System.out.println(tag);
	    	}
    	}
    	long timestamp1=new Date().getTime();
    	Map<String, ImageEmbedding> trainImageMap = getImageMap(trainId);
    	System.out.println("trainImageMap size="+trainImageMap.size());
    	
    	// We apply inclusion filter first, then exclusion filter.
    	// If there are no inclusion entries, then everything is included.
    	// If there are no exclusion entries, then nothing is excluded.
		List<ImageEmbedding> filteredImages = null;
		if (inclusionTagCount==0 && exclusionTagCount==0 && (!requireMoa)) {
			filteredImages = trainImageMap.values().stream().collect(Collectors.toList());
		} else {
			// First inclusion pass
			if (inclusionTagCount>0) {
				filteredImages = trainImageMap.values().stream().
					filter(e -> {
						int[] imageTags = tagMap.get(e.imageId);
						if (imageTags==null) {
							return false;
						}
						for (Integer tag : imageTags) {
							if (inclusionTags.contains(tag)) {
								return true;
							}
						}
						return false;
					}).collect(Collectors.toList());
			} else {
				filteredImages = trainImageMap.values().stream().collect(Collectors.toList());
			}
			System.out.println("Post inclusion pass, filteredImages size="+filteredImages.size());
			// Then exclusion pass
			if (exclusionTagCount>0 || requireMoa) {
				filteredImages = filteredImages.stream().
					filter(e -> {
						int[] imageTags = tagMap.get(e.imageId);
						if (imageTags==null && (!requireMoa)) {
							return true;
						}
						boolean hasMoaLabel=false;
						for (Integer tag : imageTags) {
							if (exclusionTags.contains(tag)) {
								return false;
							}
							String label = tagLabelMap.get(tag);
							if (label.startsWith("moa:")) {
								hasMoaLabel=true;
							}
						}
						if (requireMoa) {
							if (hasMoaLabel) {
								return true;
							} else {
								return false;
							}
						} else {
							return true;
						}
					}).collect(Collectors.toList());
			}
		}
		System.out.println("filteredImages size="+filteredImages.size());
		ImageEmbedding[] arr = new ImageEmbedding[filteredImages.size()];
    	arr = filteredImages.toArray(arr);
		ImageEmbedding queryImage=trainImageMap.get(imageId);
		if (queryImage==null) {
			System.out.println("queryImage is null");
			updateSearchStatus(searchId, "error");
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
    
    private Map<Integer, String> getTagLabelMap() {
    	Map<Integer, String> tagLabelMap = new HashMap<>();
		String payloadString = "{ \"method\": \"getAllTags\" }";
		InvokeResponse res = null ;
        try {
            SdkBytes payload = SdkBytes.fromUtf8String(payloadString);
            InvokeRequest request = InvokeRequest.builder()
                    .functionName(TAG_LAMBDA_ARN)
                    .payload(payload)
                    .build();
            res = lambdaClient.invoke(request);
            String value = res.payload().asUtf8String();
			String[] a1 = value.split("\\{");
			int i=0;
			for (String a : a1) {
				if (a.contains("tagValue")) {
					String[] a2 = a.split("\":");
					String s1 = a2[1];
					String[] a3 = s1.split(",");
					Integer id = new Integer(a3[0]);
					String s2 = a2[2];
					String[] a4 = s2.split(",");
					String s3 = a4[0];
					String label = s3.substring(2,s3.length()-2);
					System.out.println("Loading tag id="+id+" label="+label);
					tagLabelMap.put(id, label);
				}
			}
            return tagLabelMap;
        } catch(LambdaException e) {
            System.err.println(e.getMessage());
            return null;
        }
    }
    
// function createPlateTagStringMessage(plateTags: any) {
//   var message="";
//   message += "plateTags";
//   message += "\n";
//   message += plateTags.embeddingName;
//   message += "\n";
//   message += plateTags.plateId;
//   message += "\n";
//   for (let entry of plateTags.data) {
//     const tagArr = entry.tagArr;
//     message += entry.imageId;
//     message += "\n";
//     message += tagArr.length;
//     message += "\n";
//     for (let t of tagArr) {
//       message += t;
//       message += "\n"
//     }    
//   }
//   return message;
// }

    private void setPlateTags(String[] messageArr) {
    	System.out.println("Adding plateTags");
    	String embeddingName = messageArr[1];
    	System.out.println(">embeddingName="+embeddingName);
    	String plateId = messageArr[2];
    	System.out.println(">plateId="+plateId);
    	int imageCount=0;
    	for (int i=3;i<messageArr.length;) {
    		String imageId = messageArr[i++];
			int tagCount = new Integer(messageArr[i++]);
			int[] tagArr = new int[tagCount];
			for (int t=0;t<tagCount;t++) {
				tagArr[t] = new Integer(messageArr[i++]);
			}
			tagMap.put(imageId, tagArr);
			imageCount++;
    	}
    	System.out.println(">image entries="+imageCount);
    }

}

