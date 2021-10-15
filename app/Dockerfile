# The instructions for the first stage
FROM node:14-alpine3.12 as node-compiled

ARG NODE_ENV=prod
ENV NODE_ENV=${NODE_ENV}

# dependecies for npm compiling
RUN apk --no-cache --update add py-pip make g++

COPY package*.json ./
RUN npm install --only=prod

# The instructions for second stage
FROM node:14-alpine3.12

WORKDIR /usr/src/app
COPY . .
COPY --from=node-compiled node_modules node_modules

CMD [ "npm", "run", "start" ]