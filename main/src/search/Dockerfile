FROM adoptopenjdk/maven-openjdk8

ARG SRCDIR=/usr/src/search

RUN mkdir -p ${SRCDIR}

COPY ./search ${SRCDIR}

WORKDIR ${SRCDIR}

RUN mvn package

CMD mvn exec:java -Dexec.mainClass="com.bioimage.search.App"
