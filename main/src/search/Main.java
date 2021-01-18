import java.util.concurrent.*;

public class Main {

    public static void main(String[] args) {
		int i=0;
		while(true) {
	    	System.out.println("Count=" + i);
	    	try {
				TimeUnit.SECONDS.sleep(1);
	    	} catch (Exception ex) {
				ex.printStackTrace();
	    	}
	    	i+=1;
		}
    }

}
