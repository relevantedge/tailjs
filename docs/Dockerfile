FROM node

WORKDIR /app

COPY . .

RUN npm install --global http-server

ENTRYPOINT ["http-server"]
