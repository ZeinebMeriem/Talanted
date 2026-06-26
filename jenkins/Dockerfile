FROM jenkins/jenkins:lts-jdk17

USER root

RUN apt-get \
        -o Acquire::Check-Valid-Until=false \
        -o Acquire::Check-Date=false \
        -o Acquire::AllowInsecureRepositories=true \
        -o APT::Get::AllowUnauthenticated=true \
        update -qq && \
    apt-get \
        -o APT::Get::AllowUnauthenticated=true \
        install -y --no-install-recommends \
            ca-certificates curl gnupg maven python3 python3-pip ansible rsync && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get \
        -o Acquire::Check-Valid-Until=false \
        -o Acquire::Check-Date=false \
        -o Acquire::AllowInsecureRepositories=true \
        -o APT::Get::AllowUnauthenticated=true \
        update -qq && \
    apt-get \
        -o APT::Get::AllowUnauthenticated=true \
        install -y --no-install-recommends docker-ce-cli && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get -o APT::Get::AllowUnauthenticated=true install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

USER jenkins

# Skip setup wizard and pre-install essential plugins
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
RUN jenkins-plugin-cli --plugins \
    configuration-as-code \
    git \
    workflow-aggregator \
    pipeline-stage-view \
    sonar \
    role-strategy \
    docker-workflow \
    credentials-binding \
    timestamper \
    ansicolor \
    junit \
    job-dsl
