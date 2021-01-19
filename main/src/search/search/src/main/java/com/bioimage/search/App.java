package com.bioimage.search;

import java.util.concurrent.*;

public class App {

    public static void main(String[] args) {
		int i=0;
		while(true) {
	    	System.out.println("Count v3 =" + i);
	    	try {
				TimeUnit.SECONDS.sleep(1);
	    	} catch (Exception ex) {
				ex.printStackTrace();
	    	}
	    	i+=1;
		}
    }

}

