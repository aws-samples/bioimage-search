FROM adoptopenjdk/maven-openjdk8
#FROM openjdk:8

ARG SRCDIR=/usr/src/bioimage-search

RUN mkdir -p ${SRCDIR}

COPY ./search ${SRCDIR}

WORKDIR ${SRCDIR}/search

RUN mvn package

#mvn exec:java -Dexec.mainClass="com.example.myapp.App"

CMD mvn exec:java -Dexec.mainClass="com.bioimage.search.App"
