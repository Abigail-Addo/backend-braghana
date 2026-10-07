FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./


RUN npm install --legacy-peer-deps
# RUN npx prisma generate
# RUN npx prisma migrate dev --name init

COPY . .

# EXPOSE 3005

CMD [ "npm", "run", "start:dev" ]