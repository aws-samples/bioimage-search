FROM openjdk:8

ARG SRCDIR=/usr/src/bioimage-search

RUN mkdir -p ${SRCDIR}

COPY *.java ${SRCDIR}

WORKDIR ${SRCDIR}

RUN javac Main.java

CMD ["java", "Main"]
