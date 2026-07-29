FROM node:26.3.0 AS builder

WORKDIR /app

COPY package.json /app/
RUN npm install

COPY . /app
RUN npm run build


FROM nginx:1.21.0-alpine as production

ENV NODE_ENV production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
