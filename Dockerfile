FROM node:4.7.2

# setup a working directory in the image
WORKDIR /app

# Prep for running with non-root
RUN useradd -ms /bin/bash terminus

# install dependencies
COPY package.json /app/

RUN npm install  --production

# copy terminus code
COPY . /app/

RUN chown -R terminus /app
USER terminus

# Don't use npm start to ensure it runs at PID=1
CMD ./index