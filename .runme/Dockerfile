FROM node:12.16.2
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm install -g http-server
RUN http-server ./dist/
